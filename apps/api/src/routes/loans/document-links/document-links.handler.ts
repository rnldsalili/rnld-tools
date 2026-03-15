import { DocumentType, LoanDocumentLogActorType, LoanDocumentLogEventType } from '@workspace/constants';
import {
  documentLinkCreateSchema,
  documentLinkLoanIdParamSchema,
  documentLinkTokenParamSchema,
} from './document-links.schema';
import { getLoanDocumentRequestMetadata, logLoanDocumentEventSafely } from '@/api/lib/documents/logs';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { hasDocumentContent, parseDocumentContent } from '@/api/lib/documents/content';
import { getR2PresignedGetUrlOrNull } from '@/api/lib/storage/presign';
import { validate } from '@/api/lib/validator';

type KVTokenValue = {
  loanId: string;
  templateId: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
};

function listKey(loanId: string, token: string) {
  return `doc_${loanId}_${token}`;
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

    const [documentTemplates, kvList, loanDocuments] = await Promise.all([
      prisma.document.findMany({
        where: { type: DocumentType.LOAN },
        orderBy: { createdAt: 'asc' },
      }),
      c.env.KV.list<KVTokenValue>({ prefix: `doc_${loanId}_` }),
      prisma.loanDocument.findMany({
        where: { loanId },
        select: { id: true, templateId: true, signedAt: true, signatureKey: true, createdAt: true },
      }),
    ]);

    const now = new Date();

    const tokensByTemplate: Record<string, Array<{
      token: string;
      expiresAt: string;
      createdAt: string;
      isExpired: boolean;
      templateId: string;
    }>> = {};

    for (const key of kvList.keys) {
      const token = key.name.replace(`doc_${loanId}_`, '');
      const meta = key.metadata;
      if (!meta?.templateId) continue;
      const expiresAt = meta.expiresAt || '';
      const entry = {
        token,
        expiresAt,
        createdAt: meta.createdAt || '',
        isExpired: expiresAt.length > 0 ? new Date(expiresAt) < now : false,
        templateId: meta.templateId,
      };
      tokensByTemplate[meta.templateId] ??= [];
      tokensByTemplate[meta.templateId].push(entry);
    }

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
          tokens: tokensByTemplate[documentTemplate.id] ?? [],
          document: doc
            ? { id: doc.id, signedAt: doc.signedAt, createdAt: doc.createdAt, signatureUrl }
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
    const requestMetadata = getLoanDocumentRequestMetadata(c);
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const documentTemplate = await prisma.document.findUnique({
      where: { id: templateId },
    });

    if (!documentTemplate) {
      return c.json({ meta: { code: 404, message: 'Document template not found' } }, 404);
    }

    if (!hasDocumentContent(documentTemplate.content)) {
      return c.json({
        meta: { code: 422, message: 'Document template has no content. Please configure it in Settings first.' },
      }, 422);
    }

    const expiryDays = Math.max(1, documentTemplate.linkExpiryDays);
    const token = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const ttlSeconds = expiryDays * 24 * 60 * 60;

    const value: KVTokenValue = { loanId, templateId, createdByUserId: authenticatedUser.id, createdAt, expiresAt };

    await Promise.all([
      c.env.KV.put(token, JSON.stringify({ loanId, templateId }), { expirationTtl: ttlSeconds }),
      c.env.KV.put(listKey(loanId, token), JSON.stringify(value), {
        expirationTtl: ttlSeconds,
        metadata: value,
      }),
    ]);

    await logLoanDocumentEventSafely(c, {
      loanId,
      templateId,
      token,
      eventType: LoanDocumentLogEventType.LINK_CREATED,
      actorType: LoanDocumentLogActorType.AUTHENTICATED_USER,
      actorUserId: authenticatedUser.id,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      eventData: {
        expiresAt,
      },
    });

    return c.json({
      meta: { code: 201, message: 'Document link created successfully' },
      data: { token: { token, expiresAt, createdAt, isExpired: false, templateId } },
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
