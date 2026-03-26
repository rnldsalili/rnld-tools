import {
  DocumentType,
  LoanDocumentLogActorType,
  LoanDocumentLogEventType,
  NotificationEvent,
} from '@workspace/constants';
import {
  documentLinkCreateSchema,
  documentLinkLoanIdParamSchema,
  documentLinkTokenParamSchema,
  documentSignatureRequestCreateSchema,
} from './document-links.schema';
import type { Context } from 'hono';
import type { AppBindings } from '@/api/app';
import { createHandlers } from '@/api/app';
import { dispatchEventNotifications } from '@/api/lib/notifications/dispatch';
import { getNotificationSiteUrl } from '@/api/lib/notifications/placeholders';
import { getLoanDocumentRequestMetadata, logLoanDocumentEventSafely } from '@/api/lib/documents/logs';
import { initializePrisma } from '@/api/lib/db';
import { hasDocumentContent, parseDocumentContent } from '@/api/lib/documents/content';
import { getR2PresignedGetUrlOrNull } from '@/api/lib/storage/presign';
import { validate } from '@/api/lib/validator';

function listKey(loanId: string, token: string) {
  return `doc_${loanId}_${token}`;
}

function buildPublicDocumentUrl(env: Pick<CloudflareBindings, 'APP_URL'>, token: string) {
  return new URL(`/documents/${token}`, getNotificationSiteUrl(env)).toString();
}

async function getLoanDocumentLinkContext(
  prisma: ReturnType<typeof initializePrisma>,
  loanId: string,
  templateId: string,
) {
  const [loanFound, documentTemplate, existingLoanDocument] = await Promise.all([
    prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        client: true,
        _count: {
          select: {
            installments: true,
          },
        },
      },
    }),
    prisma.document.findUnique({
      where: { id: templateId },
    }),
    prisma.loanDocument.findUnique({
      where: { loanId_templateId: { loanId, templateId } },
      select: {
        id: true,
        signedAt: true,
      },
    }),
  ]);

  return {
    loanFound,
    documentTemplate,
    existingLoanDocument,
  };
}

function getDocumentTemplateValidationError(documentTemplate: {
  content: string;
  type: string;
} | null) {
  if (!documentTemplate) {
    return { message: 'Document template not found', status: 404 as const };
  }

  if (documentTemplate.type !== DocumentType.LOAN) {
    return { message: 'Document template is not available for loans', status: 422 as const };
  }

  if (!hasDocumentContent(documentTemplate.content)) {
    return {
      message: 'Document template has no content. Please configure it in Settings first.',
      status: 422 as const,
    };
  }

  return null;
}

async function createLoanDocumentLinkToken(c: Context<AppBindings>, params: {
  actorUserId: string;
  expiryDays: number;
  loanId: string;
  templateId: string;
}) {
  const { actorUserId, expiryDays, loanId, templateId } = params;
  const requestMetadata = getLoanDocumentRequestMetadata(c);
  const token = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  const ttlSeconds = expiryDays * 24 * 60 * 60;

  await c.env.KV.put(token, JSON.stringify({ loanId, templateId }), { expirationTtl: ttlSeconds });

  await logLoanDocumentEventSafely(c, {
    loanId,
    templateId,
    token,
    eventType: LoanDocumentLogEventType.LINK_CREATED,
    actorType: LoanDocumentLogActorType.AUTHENTICATED_USER,
    actorUserId,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    eventData: {
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    createdAt,
    isExpired: false,
    templateId,
  };
}

export const getDocumentLinks = createHandlers(
  validate('param', documentLinkLoanIdParamSchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const [documentTemplates, loanDocuments] = await Promise.all([
      prisma.document.findMany({
        where: { type: DocumentType.LOAN },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.loanDocument.findMany({
        where: { loanId },
        select: {
          id: true,
          templateId: true,
          signedAt: true,
          signatureKey: true,
          contentSnapshotHtml: true,
          createdAt: true,
        },
      }),
    ]);

    const docsByTemplate: Partial<Record<string, typeof loanDocuments[number]>> = {};
    for (const doc of loanDocuments) {
      docsByTemplate[doc.templateId] = doc;
    }

    const result = await Promise.all(
      documentTemplates.map(async (documentTemplate) => {
        const doc = docsByTemplate[documentTemplate.id];

        const signatureUrl = await getR2PresignedGetUrlOrNull(c.env, doc?.signatureKey);

        return {
          template: {
            id: documentTemplate.id,
            type: documentTemplate.type,
            name: documentTemplate.name,
            requiresSignature: documentTemplate.requiresSignature,
            content: parseDocumentContent(documentTemplate.content),
          },
          tokens: [],
          document: doc
            ? {
              id: doc.id,
              signedAt: doc.signedAt,
              createdAt: doc.createdAt,
              signatureUrl,
              contentSnapshotHtml: doc.contentSnapshotHtml,
            }
            : null,
        };
      }),
    );

    return c.json({
      meta: { code: 200, message: 'Document links retrieved successfully' },
      data: { templates: result },
    }, 200);
  },
);

export const createDocumentLink = createHandlers(
  validate('param', documentLinkLoanIdParamSchema),
  validate('json', documentLinkCreateSchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { templateId } = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const { loanFound, documentTemplate } = await getLoanDocumentLinkContext(prisma, loanId, templateId);

    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const validationError = getDocumentTemplateValidationError(documentTemplate);
    if (validationError) {
      return c.json({ meta: { code: validationError.status, message: validationError.message } }, validationError.status);
    }
    const documentTemplateFound = documentTemplate;
    if (!documentTemplateFound) {
      return c.json({ meta: { code: 404, message: 'Document template not found' } }, 404);
    }

    const createdToken = await createLoanDocumentLinkToken(c, {
      actorUserId: authenticatedUser.id,
      expiryDays: Math.max(1, documentTemplateFound.linkExpiryDays),
      loanId,
      templateId,
    });

    return c.json({
      meta: { code: 201, message: 'Document link created successfully' },
      data: { token: createdToken },
    }, 201);
  },
);

export const requestDocumentSignature = createHandlers(
  validate('param', documentLinkLoanIdParamSchema),
  validate('json', documentSignatureRequestCreateSchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { templateId } = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const {
      loanFound,
      documentTemplate,
      existingLoanDocument,
    } = await getLoanDocumentLinkContext(prisma, loanId, templateId);

    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const validationError = getDocumentTemplateValidationError(documentTemplate);
    if (validationError) {
      return c.json({ meta: { code: validationError.status, message: validationError.message } }, validationError.status);
    }
    const documentTemplateFound = documentTemplate;
    if (!documentTemplateFound) {
      return c.json({ meta: { code: 404, message: 'Document template not found' } }, 404);
    }

    if (!documentTemplateFound.requiresSignature) {
      return c.json({
        meta: { code: 422, message: 'Document template does not require a client signature.' },
      }, 422);
    }

    if (existingLoanDocument?.signedAt) {
      return c.json({ meta: { code: 409, message: 'Document has already been signed' } }, 409);
    }

    const createdToken = await createLoanDocumentLinkToken(c, {
      actorUserId: authenticatedUser.id,
      expiryDays: Math.max(1, documentTemplateFound.linkExpiryDays),
      loanId,
      templateId,
    });
    const signUrl = buildPublicDocumentUrl(c.env, createdToken.token);
    const dispatchResult = await dispatchEventNotifications({
      env: c.env,
      prisma,
      event: NotificationEvent.DOCUMENT_SIGNATURE_REQUESTED,
      queuedByUserId: authenticatedUser.id,
      notificationsEnabled: loanFound.notificationsEnabled,
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
          installmentCount: loanFound._count.installments,
        },
        document: {
          name: documentTemplateFound.name,
          signUrl,
          signedAt: null,
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

    return c.json({
      meta: { code: 201, message: 'Document signature request created successfully' },
      data: {
        token: createdToken,
        signUrl,
        notification: dispatchResult,
      },
    }, 201);
  },
);

export const deleteDocumentLink = createHandlers(
  validate('param', documentLinkTokenParamSchema),
  async (c) => {
    const { loanId, token } = c.req.valid('param');
    const authenticatedUser = c.get('user');
    const requestMetadata = getLoanDocumentRequestMetadata(c);

    const existing = await c.env.KV.get<{ loanId: string; templateId: string }>(token, { type: 'json' });
    if (!existing) {
      return c.json({ meta: { code: 404, message: 'Document link not found or already expired' } }, 404);
    }

    await Promise.all([
      c.env.KV.delete(token),
      c.env.KV.delete(listKey(loanId, token)),
    ]);

    await logLoanDocumentEventSafely(c, {
      loanId,
      templateId: existing.templateId,
      token,
      eventType: LoanDocumentLogEventType.LINK_REVOKED,
      actorType: LoanDocumentLogActorType.AUTHENTICATED_USER,
      actorUserId: authenticatedUser.id,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
    });

    return c.json({ meta: { code: 200, message: 'Document link revoked successfully' } }, 200);
  },
);
