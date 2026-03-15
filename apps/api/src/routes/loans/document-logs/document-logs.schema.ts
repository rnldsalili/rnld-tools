import { limitValidator, pageValidator } from '@workspace/constants';
import { z } from 'zod';

export const loanDocumentLogLoanIdParamSchema = z.object({
  loanId: z.string().trim().min(1),
});

export const loanDocumentLogQuerySchema = z.object({
  templateId: z.string().trim().min(1).optional(),
  token: z.string().trim().min(1).optional(),
  page: pageValidator,
  limit: limitValidator,
});
