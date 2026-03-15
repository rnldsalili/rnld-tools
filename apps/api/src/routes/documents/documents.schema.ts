import { DOCUMENT_TYPES } from '@workspace/constants';
import { z } from 'zod';

const documentTypeSchema = z.enum(DOCUMENT_TYPES);
const documentContentSchema = z.object({}).catchall(z.unknown());

export const documentQuerySchema = z.object({
  type: documentTypeSchema.optional(),
});

export const documentIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const createDocumentSchema = z.object({
  type: documentTypeSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  content: documentContentSchema.optional(),
  linkExpiryDays: z.number().int().min(1).max(365).optional(),
  requiresSignature: z.boolean().optional(),
});

export const updateDocumentSchema = z.object({
  type: documentTypeSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  content: documentContentSchema,
  linkExpiryDays: z.number().int().min(1).max(365),
  requiresSignature: z.boolean(),
});
