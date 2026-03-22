import {
  NOTIFICATION_EMAIL_PROVIDER_LABELS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_CHANNELS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_LOG_STATUS_LABELS,
  NOTIFICATION_SMS_PROVIDER_LABELS,
  NotificationChannel,
  NotificationContentFormat,
  NotificationEvent,
} from '@workspace/constants';
import {
  createNotificationTemplateSchema,
  notificationEventConfigParamSchema,
  notificationLogIdParamSchema,
  notificationLogsQuerySchema,
  notificationTemplateIdParamSchema,
  notificationTemplatePreviewSchema,
  notificationTemplatesQuerySchema,
  notificationTestSendSchema,
  updateNotificationEventConfigSchema,
  updateNotificationTemplateSchema,
} from './notifications.schema';
import type { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import {
  getEmailProviderStatus,
  getSmsProviderStatus,
} from '@/api/lib/notifications/config';
import {
  createNotificationLog,
  markNotificationLogQueueFailed,
} from '@/api/lib/notifications/logs';
import {
  enqueueEmailNotificationJob,
  enqueueSmsNotificationJob,
} from '@/api/lib/notifications/queue';
import {
  getDefaultNotificationTemplateContent,
  parseNotificationTemplateContent,
  renderEmailTemplate,
  renderSmsTemplate,
  serializeNotificationTemplateContent,
} from '@/api/lib/notifications/renderer';
import { getNotificationSiteUrl } from '@/api/lib/notifications/placeholders';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';

export const getNotificationTemplates = createHandlers(
  validate('query', notificationTemplatesQuerySchema),
  async (c) => {
    const { channel } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const notificationTemplates = await prisma.notificationTemplate.findMany({
      where: channel ? { channel } : undefined,
      orderBy: [
        { channel: 'asc' },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        channel: true,
        name: true,
        description: true,
        subject: true,
        contentFormat: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json({
      meta: { code: 200, message: 'Notification templates retrieved successfully' },
      data: { templates: notificationTemplates },
    }, 200);
  },
);

export const getNotificationTemplateById = createHandlers(
  validate('param', notificationTemplateIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const notificationTemplate = await prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!notificationTemplate) {
      return c.json({ meta: { code: 404, message: 'Notification template not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'Notification template retrieved successfully' },
      data: {
        template: {
          ...notificationTemplate,
          content: parseNotificationTemplateContent(
            getNotificationContentFormat(notificationTemplate.contentFormat),
            notificationTemplate.content,
          ),
        },
      },
    }, 200);
  },
);

export const createNotificationTemplate = createHandlers(
  validate('json', createNotificationTemplateSchema),
  async (c) => {
    const notificationTemplatePayload = c.req.valid('json');
    const prisma = initializePrisma(c.env);

    const serializedContent = serializeNotificationTemplateContent(
      notificationTemplatePayload.channel,
      notificationTemplatePayload.content
        ?? getDefaultNotificationTemplateContent(notificationTemplatePayload.channel),
    );

    const createdTemplate = await prisma.notificationTemplate.create({
      data: {
        channel: notificationTemplatePayload.channel,
        name: notificationTemplatePayload.name.trim(),
        description: notificationTemplatePayload.description?.trim() || null,
        subject: notificationTemplatePayload.channel === NotificationChannel.EMAIL
          ? notificationTemplatePayload.subject?.trim() || notificationTemplatePayload.name.trim()
          : null,
        content: serializedContent.content,
        contentFormat: serializedContent.contentFormat,
      },
    });

    return c.json({
      meta: { code: 201, message: 'Notification template created successfully' },
      data: {
        template: {
          ...createdTemplate,
          content: parseNotificationTemplateContent(
            getNotificationContentFormat(createdTemplate.contentFormat),
            createdTemplate.content,
          ),
        },
      },
    }, 201);
  },
);

export const updateNotificationTemplate = createHandlers(
  validate('param', notificationTemplateIdParamSchema),
  validate('json', updateNotificationTemplateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const notificationTemplatePayload = c.req.valid('json');
    const prisma = initializePrisma(c.env);

    const existingTemplate = await prisma.notificationTemplate.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTemplate) {
      return c.json({ meta: { code: 404, message: 'Notification template not found' } }, 404);
    }

    const serializedContent = serializeNotificationTemplateContent(
      notificationTemplatePayload.channel,
      notificationTemplatePayload.content,
    );

    const updatedTemplate = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        channel: notificationTemplatePayload.channel,
        name: notificationTemplatePayload.name.trim(),
        description: notificationTemplatePayload.description?.trim() || null,
        subject: notificationTemplatePayload.channel === NotificationChannel.EMAIL
          ? notificationTemplatePayload.subject.trim()
          : null,
        content: serializedContent.content,
        contentFormat: serializedContent.contentFormat,
      },
    });

    return c.json({
      meta: { code: 200, message: 'Notification template updated successfully' },
      data: {
        template: {
          ...updatedTemplate,
          content: parseNotificationTemplateContent(
            getNotificationContentFormat(updatedTemplate.contentFormat),
            updatedTemplate.content,
          ),
        },
      },
    }, 200);
  },
);

export const deleteNotificationTemplate = createHandlers(
  validate('param', notificationTemplateIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const existingTemplate = await prisma.notificationTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            notificationConfigs: true,
          },
        },
      },
    });

    if (!existingTemplate) {
      return c.json({ meta: { code: 404, message: 'Notification template not found' } }, 404);
    }

    if (existingTemplate._count.notificationConfigs > 0) {
      return c.json({
        meta: {
          code: 409,
          message: 'This template is assigned to one or more event mappings.',
        },
      }, 409);
    }

    await prisma.notificationTemplate.delete({ where: { id } });

    return c.json({ meta: { code: 200, message: 'Notification template deleted successfully' } }, 200);
  },
);

export const getNotificationEventConfigs = createHandlers(
  async (c) => {
    const prisma = initializePrisma(c.env);

    const notificationEventConfigs = await prisma.notificationEventConfig.findMany({
      include: {
        template: {
          select: {
            id: true,
            channel: true,
            name: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        { event: 'asc' },
        { channel: 'asc' },
      ],
    });

    const notificationConfigMap = new Map(
      notificationEventConfigs.map((config) => [`${config.event}:${config.channel}`, config]),
    );

    const eventConfigs = NOTIFICATION_EVENTS.flatMap((event) =>
      NOTIFICATION_EVENT_CHANNELS[event].map((channel) => {
        const config = notificationConfigMap.get(`${event}:${channel}`);

        return {
          event,
          eventLabel: NOTIFICATION_EVENT_LABELS[event],
          channel,
          config: config
            ? {
              id: config.id,
              templateId: config.templateId,
              isEnabled: config.isEnabled,
              emailProvider: config.emailProvider,
              smsProvider: config.smsProvider,
              updatedAt: config.updatedAt,
              template: config.template,
            }
            : null,
        };
      }),
    );

    return c.json({
      meta: { code: 200, message: 'Notification event configs retrieved successfully' },
      data: {
        eventConfigs,
        providerStatus: {
          email: getEmailProviderStatus(c.env),
          sms: getSmsProviderStatus(c.env),
        },
        providerLabels: {
          email: NOTIFICATION_EMAIL_PROVIDER_LABELS,
          sms: NOTIFICATION_SMS_PROVIDER_LABELS,
        },
      },
    }, 200);
  },
);

export const getNotificationLogs = createHandlers(
  validate('query', notificationLogsQuerySchema),
  async (c) => {
    const { search, channel, event, status, testSend, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);
    const skipCount = (page - 1) * limit;
    const normalizedSearch = search?.trim();
    const notificationLogFilter: Prisma.NotificationLogWhereInput = {
      ...(channel ? { channel } : {}),
      ...(event ? { event } : {}),
      ...(status ? { status } : {}),
      ...(testSend !== undefined ? { isTestSend: testSend } : {}),
      ...(normalizedSearch
        ? {
          OR: [
            { recipientEmail: { contains: normalizedSearch } },
            { recipientName: { contains: normalizedSearch } },
            { recipientPhone: { contains: normalizedSearch } },
            { subject: { contains: normalizedSearch } },
            { messageContent: { contains: normalizedSearch } },
            { lastErrorMessage: { contains: normalizedSearch } },
          ],
        }
        : {}),
    };

    const [notificationLogs, totalNotificationLogs] = await Promise.all([
      prisma.notificationLog.findMany({
        where: notificationLogFilter,
        orderBy: { queuedAt: 'desc' },
        skip: skipCount,
        take: limit,
        select: {
          id: true,
          channel: true,
          event: true,
          status: true,
          isTestSend: true,
          emailProvider: true,
          smsProvider: true,
          recipientEmail: true,
          recipientName: true,
          recipientPhone: true,
          subject: true,
          attemptCount: true,
          lastErrorMessage: true,
          queuedAt: true,
          lastAttemptAt: true,
          sentAt: true,
          failedAt: true,
        },
      }),
      prisma.notificationLog.count({ where: notificationLogFilter }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Notification logs retrieved successfully' },
      data: {
        logs: notificationLogs,
        pagination: {
          page,
          limit,
          total: totalNotificationLogs,
          totalPages: Math.ceil(totalNotificationLogs / limit),
        },
        statusLabels: NOTIFICATION_LOG_STATUS_LABELS,
      },
    }, 200);
  },
);

export const getNotificationLogById = createHandlers(
  validate('param', notificationLogIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const notificationLog = await prisma.notificationLog.findUnique({
      where: { id },
      include: {
        queuedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!notificationLog) {
      return c.json({ meta: { code: 404, message: 'Notification log not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'Notification log retrieved successfully' },
      data: { log: notificationLog },
    }, 200);
  },
);

export const updateNotificationEventConfig = createHandlers(
  validate('param', notificationEventConfigParamSchema),
  validate('json', updateNotificationEventConfigSchema),
  async (c) => {
    const { event, channel } = c.req.valid('param');
    const notificationEventConfigPayload = c.req.valid('json');
    const prisma = initializePrisma(c.env);

    const notificationTemplate = await prisma.notificationTemplate.findUnique({
      where: { id: notificationEventConfigPayload.templateId },
      select: {
        id: true,
        channel: true,
        name: true,
      },
    });

    if (!notificationTemplate) {
      return c.json({ meta: { code: 404, message: 'Notification template not found' } }, 404);
    }

    if (notificationTemplate.channel !== channel) {
      return c.json({
        meta: {
          code: 422,
          message: 'Template channel does not match the selected notification channel.',
        },
      }, 422);
    }

    if (channel === NotificationChannel.EMAIL) {
      if (!notificationEventConfigPayload.emailProvider || notificationEventConfigPayload.smsProvider) {
        return c.json({
          meta: {
            code: 422,
            message: 'Email event configs must use an email provider only.',
          },
        }, 422);
      }
    }

    if (channel === NotificationChannel.SMS) {
      if (!notificationEventConfigPayload.smsProvider || notificationEventConfigPayload.emailProvider) {
        return c.json({
          meta: {
            code: 422,
            message: 'SMS event configs must use an SMS provider only.',
          },
        }, 422);
      }
    }

    const notificationEventConfig = await prisma.notificationEventConfig.upsert({
      where: {
        event_channel: {
          event,
          channel,
        },
      },
      update: {
        templateId: notificationEventConfigPayload.templateId,
        isEnabled: notificationEventConfigPayload.isEnabled,
        emailProvider: channel === NotificationChannel.EMAIL
          ? notificationEventConfigPayload.emailProvider ?? null
          : null,
        smsProvider: channel === NotificationChannel.SMS
          ? notificationEventConfigPayload.smsProvider ?? null
          : null,
      },
      create: {
        event,
        channel,
        templateId: notificationEventConfigPayload.templateId,
        isEnabled: notificationEventConfigPayload.isEnabled,
        emailProvider: channel === NotificationChannel.EMAIL
          ? notificationEventConfigPayload.emailProvider ?? null
          : null,
        smsProvider: channel === NotificationChannel.SMS
          ? notificationEventConfigPayload.smsProvider ?? null
          : null,
      },
      include: {
        template: {
          select: {
            id: true,
            channel: true,
            name: true,
            updatedAt: true,
          },
        },
      },
    });

    return c.json({
      meta: { code: 200, message: 'Notification event config updated successfully' },
      data: { config: notificationEventConfig },
    }, 200);
  },
);

export const renderNotificationTemplatePreview = createHandlers(
  validate('json', notificationTemplatePreviewSchema),
  (c) => {
    const notificationTemplatePreviewPayload = c.req.valid('json');
    const samplePreviewEvent = NotificationEvent.LOAN_CREATED;

    if (notificationTemplatePreviewPayload.channel === NotificationChannel.EMAIL) {
      const renderedEmail = renderEmailTemplate({
        event: samplePreviewEvent,
        subject: notificationTemplatePreviewPayload.subject?.trim() || 'Notification',
        content: notificationTemplatePreviewPayload.content,
        siteUrl: getNotificationSiteUrl(c.env),
      });

      return c.json({
        meta: { code: 200, message: 'Notification template preview rendered successfully' },
        data: {
          channel: NotificationChannel.EMAIL,
          preview: renderedEmail,
        },
      }, 200);
    }

    const renderedSms = renderSmsTemplate({
      event: samplePreviewEvent,
      content: notificationTemplatePreviewPayload.content,
      siteUrl: getNotificationSiteUrl(c.env),
    });

    return c.json({
      meta: { code: 200, message: 'Notification template preview rendered successfully' },
      data: {
        channel: NotificationChannel.SMS,
        preview: renderedSms,
      },
    }, 200);
  },
);

export const testSendNotification = createHandlers(
  validate('json', notificationTestSendSchema),
  async (c) => {
    const notificationTestSendPayload = c.req.valid('json');
    const authenticatedUser = c.get('user');

    if (notificationTestSendPayload.channel === NotificationChannel.EMAIL) {
      const renderedEmail = renderEmailTemplate({
        event: notificationTestSendPayload.event,
        subject: notificationTestSendPayload.subject,
        content: notificationTestSendPayload.content,
        siteUrl: getNotificationSiteUrl(c.env),
      });
      const notificationLog = await createNotificationLog(c.env, {
        channel: NotificationChannel.EMAIL,
        event: null,
        provider: notificationTestSendPayload.emailProvider,
        recipientEmail: notificationTestSendPayload.recipientEmail,
        recipientName: notificationTestSendPayload.recipientName?.trim() || null,
        subject: renderedEmail.subject,
        messageContent: renderedEmail.html,
        queuedAt: new Date().toISOString(),
        queuedByUserId: authenticatedUser.id,
        isTestSend: true,
      });

      try {
        await enqueueEmailNotificationJob(c.env, {
          notificationLogId: notificationLog.id,
          channel: NotificationChannel.EMAIL,
          provider: notificationTestSendPayload.emailProvider,
          recipient: {
            email: notificationTestSendPayload.recipientEmail,
            name: notificationTestSendPayload.recipientName?.trim() || null,
          },
          subject: renderedEmail.subject,
          html: renderedEmail.html,
          trace: {
            event: notificationTestSendPayload.event,
            queuedAt: notificationLog.queuedAt.toISOString(),
            queuedByUserId: authenticatedUser.id,
            testSend: true,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to enqueue email notification.';
        await markNotificationLogQueueFailed(c.env, {
          notificationLogId: notificationLog.id,
          errorMessage,
        });
        throw error;
      }

      return c.json({
        meta: { code: 202, message: 'Email notification queued successfully' },
      }, 202);
    }

    const renderedSms = renderSmsTemplate({
      event: notificationTestSendPayload.event,
      content: notificationTestSendPayload.content,
      siteUrl: getNotificationSiteUrl(c.env),
    });
    const notificationLog = await createNotificationLog(c.env, {
      channel: NotificationChannel.SMS,
      event: null,
      provider: notificationTestSendPayload.smsProvider,
      recipientPhone: notificationTestSendPayload.recipientPhone,
      messageContent: renderedSms.text,
      queuedAt: new Date().toISOString(),
      queuedByUserId: authenticatedUser.id,
      isTestSend: true,
    });

    try {
      await enqueueSmsNotificationJob(c.env, {
        notificationLogId: notificationLog.id,
        channel: NotificationChannel.SMS,
        provider: notificationTestSendPayload.smsProvider,
        recipient: {
          phone: notificationTestSendPayload.recipientPhone,
        },
        text: renderedSms.text,
        trace: {
          event: notificationTestSendPayload.event,
          queuedAt: notificationLog.queuedAt.toISOString(),
          queuedByUserId: authenticatedUser.id,
          testSend: true,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enqueue SMS notification.';
      await markNotificationLogQueueFailed(c.env, {
        notificationLogId: notificationLog.id,
        errorMessage,
      });
      throw error;
    }

    return c.json({
      meta: { code: 202, message: 'SMS notification queued successfully' },
    }, 202);
  },
);

function getNotificationContentFormat(value: string): NotificationContentFormat {
  return value === NotificationContentFormat.PLAIN_TEXT
    ? NotificationContentFormat.PLAIN_TEXT
    : NotificationContentFormat.RICH_TEXT_JSON;
}
