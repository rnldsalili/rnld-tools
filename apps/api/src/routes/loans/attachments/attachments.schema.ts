import { z } from 'zod';

export const loanAttachmentLoanIdParamSchema = z.object({
  loanId: z.string().trim().length(25),
});

export const loanAttachmentParamSchema = z.object({
  loanId: z.string().trim().length(25),
  attachmentId: z.string().trim().length(25),
});

export const loanAttachmentUploadFormSchema = z.object({
  file: z.custom<File>((value) => value instanceof File, {
    message: 'Attachment file is required',
  }),
});
