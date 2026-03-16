import { z } from 'zod';

export const loanDocumentPdfParamSchema = z.object({
  loanId: z.string().trim().length(25),
  templateId: z.string().trim().length(25),
});
