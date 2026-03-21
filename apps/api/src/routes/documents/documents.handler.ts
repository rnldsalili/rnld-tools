import { createDocumentSchema, documentIdParamSchema, documentQuerySchema, updateDocumentSchema } from './documents.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { parseDocumentContent, serializeDocumentContent } from '@/api/lib/documents/content';
import { deleteStoredObject } from '@/api/lib/storage/storage';
import { validate } from '@/api/lib/validator';

export const getDocuments = createHandlers(
  validate('query', documentQuerySchema),
  async (c) => {
    const { type } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const documents = await prisma.document.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        linkExpiryDays: true,
        requiresSignature: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json({
      meta: { code: 200, message: 'Documents retrieved successfully' },
      data: { documents },
    }, 200);
  },
);

export const getDocumentById = createHandlers(
  validate('param', documentIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const documentFound = await prisma.document.findUnique({ where: { id } });

    if (!documentFound) {
      return c.json({ meta: { code: 404, message: 'Document not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'Document retrieved successfully' },
      data: {
        document: {
          ...documentFound,
          content: parseDocumentContent(documentFound.content),
        },
      },
    }, 200);
  },
);

export const createDocument = createHandlers(
  validate('json', createDocumentSchema),
  async (c) => {
    const documentPayload = c.req.valid('json');
    const prisma = initializePrisma(c.env);

    const createdDocument = await prisma.document.create({
      data: {
        type: documentPayload.type,
        name: documentPayload.name,
        description: documentPayload.description?.trim() || null,
        content: serializeDocumentContent(documentPayload.content),
        linkExpiryDays: documentPayload.linkExpiryDays ?? 7,
        requiresSignature: documentPayload.requiresSignature ?? true,
      },
    });

    return c.json({
      meta: { code: 201, message: 'Document created successfully' },
      data: {
        document: {
          ...createdDocument,
          content: parseDocumentContent(createdDocument.content),
        },
      },
    }, 201);
  },
);

export const updateDocument = createHandlers(
  validate('param', documentIdParamSchema),
  validate('json', updateDocumentSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const documentPayload = c.req.valid('json');
    const prisma = initializePrisma(c.env);

    const existingDocument = await prisma.document.findUnique({ where: { id } });

    if (!existingDocument) {
      return c.json({ meta: { code: 404, message: 'Document not found' } }, 404);
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        type: documentPayload.type,
        name: documentPayload.name,
        description: documentPayload.description?.trim() || null,
        content: serializeDocumentContent(documentPayload.content),
        linkExpiryDays: documentPayload.linkExpiryDays,
        requiresSignature: documentPayload.requiresSignature,
      },
    });

    return c.json({
      meta: { code: 200, message: 'Document updated successfully' },
      data: {
        document: {
          ...updatedDocument,
          content: parseDocumentContent(updatedDocument.content),
        },
      },
    }, 200);
  },
);

export const deleteDocument = createHandlers(
  validate('param', documentIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const existingDocument = await prisma.document.findUnique({ where: { id } });

    if (!existingDocument) {
      return c.json({ meta: { code: 404, message: 'Document not found' } }, 404);
    }

    const loanDocumentsWithSignatures = await prisma.loanDocument.findMany({
      where: {
        templateId: id,
        signatureKey: {
          not: null,
        },
      },
      select: {
        signatureKey: true,
      },
    });
    const signatureKeys = Array.from(
      new Set(
        loanDocumentsWithSignatures
          .map((loanDocument) => loanDocument.signatureKey)
          .filter((signatureKey): signatureKey is string => Boolean(signatureKey)),
      ),
    );

    await Promise.all(signatureKeys.map((signatureKey) => deleteStoredObject(c.env.STORAGE, signatureKey)));
    await prisma.document.delete({ where: { id } });

    return c.json({ meta: { code: 200, message: 'Document deleted successfully' } }, 200);
  },
);
