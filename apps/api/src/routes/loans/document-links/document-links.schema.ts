import { z } from 'zod';

export const documentLinkLoanIdParamSchema = z.object({
  loanId: z.string().trim().min(1),
});

export const documentLinkCreateSchema = z.object({
  templateId: z.string().trim().min(1),
});

export const documentLinkTokenParamSchema = z.object({
  loanId: z.string().trim().min(1),
  token: z.string().trim().min(1),
});
