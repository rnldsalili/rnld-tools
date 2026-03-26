import {
  LoanDocumentLogActorType,
  LoanDocumentLogEventType,
  NotificationChannel,
  NotificationEvent,
} from '@workspace/constants';
import { documentSignSchema, documentTokenParamSchema } from './public-document.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { parseDocumentContent } from '@/api/lib/documents/content';
import {
  getLoanDocumentLogContextByToken,
  getLoanDocumentRequestMetadata,
  logLoanDocumentEventSafely,
} from '@/api/lib/documents/logs';
import { dispatchEventNotifications } from '@/api/lib/notifications/dispatch';
import { getNotificationSiteUrl } from '@/api/lib/notifications/placeholders';
import {
  base64DataUrlToUint8Array,
  ensureLoanDocumentContentSnapshot,
  renderLoanDocumentContentSnapshot,
} from '@/api/lib/documents/snapshot';
import { getR2PresignedGetUrlOrNull } from '@/api/lib/storage/presign';
import { validate } from '@/api/lib/validator';

export const getPublicDocument = createHandlers(
  validate('param', documentTokenParamSchema),
  async (c) => {
    const { token } = c.req.valid('param');
    const requestMetadata = getLoanDocumentRequestMetadata(c);
    const prisma = initializePrisma(c.env);

    const kvEntry = await c.env.KV.get<{ loanId: string; templateId: string }>(token, { type: 'json' });

    if (!kvEntry) {
      const existingLogContext = await getLoanDocumentLogContextByToken(c, token).catch(() => null);

      if (existingLogContext) {
        await logLoanDocumentEventSafely(c, {
          loanId: existingLogContext.loanId,
          templateId: existingLogContext.templateId,
          loanDocumentId: existingLogContext.loanDocumentId,
          token,
          eventType: LoanDocumentLogEventType.LINK_ACCESS_INVALID_OR_EXPIRED,
          actorType: LoanDocumentLogActorType.PUBLIC_LINK_VISITOR,
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
      }

      return c.json({ meta: { code: 404, message: 'Document link not found or has expired' } }, 404);
    }

    const { loanId, templateId } = kvEntry;

    const [loanFound, loanDocumentFound, documentFound] = await Promise.all([
      prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          client: true,
          installments: { orderBy: { dueDate: 'asc' } },
        },
      }),
      prisma.loanDocument.findUnique({ where: { loanId_templateId: { loanId, templateId } } }),
      prisma.document.findUnique({ where: { id: templateId } }),
    ]);

    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    if (!documentFound) {
      return c.json({ meta: { code: 404, message: 'Document template not found' } }, 404);
    }

    const contentSnapshotHtml = loanDocumentFound?.signedAt
      ? await ensureLoanDocumentContentSnapshot(c.env, {
        contentSnapshotHtml: loanDocumentFound.contentSnapshotHtml,
        loanDocumentId: loanDocumentFound.id,
        loanId,
        signedAt: loanDocumentFound.signedAt,
        signatureKey: loanDocumentFound.signatureKey,
        templateId,
      })
      : null;
    const signatureUrl = await getR2PresignedGetUrlOrNull(c.env, loanDocumentFound?.signatureKey);

    await logLoanDocumentEventSafely(c, {
      loanId,
      templateId,
      loanDocumentId: loanDocumentFound?.id,
      token,
      eventType: LoanDocumentLogEventType.LINK_VIEWED,
      actorType: LoanDocumentLogActorType.PUBLIC_LINK_VISITOR,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      eventData: {
        signedAt: loanDocumentFound?.signedAt?.toISOString() ?? null,
      },
    });

    return c.json({
      meta: { code: 200, message: 'Document retrieved successfully' },
      data: {
        loan: {
          id: loanFound.id,
          clientId: loanFound.clientId,
          amount: loanFound.amount,
          currency: loanFound.currency,
          interestRate: loanFound.interestRate,
          description: loanFound.description,
          installmentInterval: loanFound.installmentInterval,
          loanDate: loanFound.loanDate,
          createdAt: loanFound.createdAt,
          updatedAt: loanFound.updatedAt,
          createdByUserId: loanFound.createdByUserId,
          updatedByUserId: loanFound.updatedByUserId,
          client: {
            id: loanFound.client.id,
            name: loanFound.client.name,
            phone: loanFound.client.phone,
            email: loanFound.client.email,
            address: loanFound.client.address,
            status: loanFound.client.status,
            createdAt: loanFound.client.createdAt,
            updatedAt: loanFound.client.updatedAt,
            createdByUserId: loanFound.client.createdByUserId,
            updatedByUserId: loanFound.client.updatedByUserId,
          },
          installments: loanFound.installments.map((installment) => ({
            id: installment.id,
            loanId: installment.loanId,
            dueDate: installment.dueDate,
            amount: installment.amount,
            status: installment.status,
            paidAt: installment.paidAt,
            remarks: installment.remarks,
            createdAt: installment.createdAt,
            updatedAt: installment.updatedAt,
            createdByUserId: installment.createdByUserId,
            updatedByUserId: installment.updatedByUserId,
          })),
        },
        document: {
          id: documentFound.id,
          type: documentFound.type,
          name: documentFound.name,
          content: parseDocumentContent(documentFound.content),
          requiresSignature: documentFound.requiresSignature,
        },
        signing: {
          contentSnapshotHtml,
          signedAt: loanDocumentFound?.signedAt ?? null,
          signatureUrl,
        },
      },
    }, 200);
  },
);

export const signPublicDocument = createHandlers(
  validate('param', documentTokenParamSchema),
  validate('json', documentSignSchema),
  async (c) => {
    const { token } = c.req.valid('param');
    const { signatureData } = c.req.valid('json');
    const requestMetadata = getLoanDocumentRequestMetadata(c);
    const prisma = initializePrisma(c.env);

    const kvEntry = await c.env.KV.get<{ loanId: string; templateId: string }>(token, { type: 'json' });

    if (!kvEntry) {
      const existingLogContext = await getLoanDocumentLogContextByToken(c, token).catch(() => null);

      if (existingLogContext) {
        await logLoanDocumentEventSafely(c, {
          loanId: existingLogContext.loanId,
          templateId: existingLogContext.templateId,
          loanDocumentId: existingLogContext.loanDocumentId,
          token,
          eventType: LoanDocumentLogEventType.SIGN_ATTEMPT_INVALID_OR_EXPIRED,
          actorType: LoanDocumentLogActorType.PUBLIC_LINK_VISITOR,
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
        });
      }

      return c.json({ meta: { code: 404, message: 'Document link not found or has expired' } }, 404);
    }

    const { loanId, templateId } = kvEntry;

    const [loanFound, documentFound] = await Promise.all([
      prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          client: true,
          installments: { orderBy: { dueDate: 'asc' } },
        },
      }),
      prisma.document.findUnique({ where: { id: templateId } }),
    ]);

    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    if (!documentFound) {
      return c.json({ meta: { code: 404, message: 'Document template not found' } }, 404);
    }

    if (documentFound.requiresSignature && !signatureData) {
      await logLoanDocumentEventSafely(c, {
        loanId,
        templateId,
        token,
        eventType: LoanDocumentLogEventType.SIGN_ATTEMPT_MISSING_SIGNATURE,
        actorType: LoanDocumentLogActorType.PUBLIC_LINK_VISITOR,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
      });

      return c.json({ meta: { code: 400, message: 'Signature is required for this document' } }, 400);
    }

    const existingLoanDocument = await prisma.loanDocument.findUnique({
      where: { loanId_templateId: { loanId, templateId } },
    });

    if (existingLoanDocument?.signedAt) {
      await logLoanDocumentEventSafely(c, {
        loanId,
        templateId,
        loanDocumentId: existingLoanDocument.id,
        token,
        eventType: LoanDocumentLogEventType.SIGN_ATTEMPT_DUPLICATE,
        actorType: LoanDocumentLogActorType.PUBLIC_LINK_VISITOR,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        eventData: {
          signedAt: existingLoanDocument.signedAt.toISOString(),
        },
      });

      return c.json({ meta: { code: 409, message: 'Document has already been signed' } }, 409);
    }

    let signatureKey: string | null = null;
    if (documentFound.requiresSignature && signatureData) {
      const candidateSignatureKey = `signatures/${loanId}/${templateId}.png`;
      const bytes = base64DataUrlToUint8Array(signatureData);

      try {
        await c.env.STORAGE.put(candidateSignatureKey, bytes, {
          httpMetadata: { contentType: 'image/png' },
        });
        signatureKey = candidateSignatureKey;
      } catch (storageError) {
        console.error('Failed to store document signature image', storageError);
      }
    }

    const now = new Date();
    const contentSnapshotHtml = renderLoanDocumentContentSnapshot({
      content: documentFound.content,
      loan: loanFound,
      signatureDataUrl: signatureData ?? null,
      signedAt: now,
    });
    const savedLoanDocument = await prisma.loanDocument.upsert({
      where: { loanId_templateId: { loanId, templateId } },
      create: { loanId, templateId, signedAt: now, signatureKey, contentSnapshotHtml },
      update: { signedAt: now, signatureKey, contentSnapshotHtml },
    });

    await logLoanDocumentEventSafely(c, {
      loanId,
      templateId,
      loanDocumentId: savedLoanDocument.id,
      token,
      eventType: LoanDocumentLogEventType.DOCUMENT_SIGNED,
      actorType: LoanDocumentLogActorType.PUBLIC_LINK_VISITOR,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      eventData: {
        signedAt: savedLoanDocument.signedAt?.toISOString() ?? null,
        signatureStored: signatureKey !== null,
      },
    });

    try {
      const hasSignedNotificationConfig = await prisma.notificationEventConfig.count({
        where: {
          event: NotificationEvent.DOCUMENT_SIGNED,
          channel: NotificationChannel.EMAIL,
          isEnabled: true,
        },
      });

      if (hasSignedNotificationConfig > 0) {
        const signUrl = new URL(`/documents/${token}`, getNotificationSiteUrl(c.env)).toString();

        await dispatchEventNotifications({
          env: c.env,
          prisma,
          event: NotificationEvent.DOCUMENT_SIGNED,
          queuedByUserId: null,
          notificationsEnabled: loanFound.notificationsEnabled,
          emailAttachmentSources: [
            {
              kind: 'loan_document_pdf',
              loanId,
              templateId,
            },
          ],
          context: {
            client: {
              name: loanFound.client.name,
              email: loanFound.client.email ?? '',
              phone: loanFound.client.phone ?? '',
            },
            loan: {
              id: loanFound.id,
              amount: loanFound.amount,
              excessBalance: loanFound.excessBalance,
              currency: loanFound.currency,
              description: loanFound.description,
              loanDate: loanFound.loanDate.toISOString(),
              installmentCount: loanFound.installments.length,
            },
            document: {
              name: documentFound.name,
              signUrl,
              signedAt: savedLoanDocument.signedAt?.toISOString() ?? now.toISOString(),
            },
            installment: {
              number: null,
              amount: null,
              dueDate: null,
              paidAt: null,
            },
            user: {
              name: '',
              email: '',
              temporaryPassword: '',
            },
          },
        });
      }
    } catch (notificationError) {
      console.error('Failed to queue signed document notification', notificationError);
    }

    return c.json({
      meta: { code: 200, message: 'Document signed successfully' },
      data: { signedAt: savedLoanDocument.signedAt },
    }, 200);
  },
);
