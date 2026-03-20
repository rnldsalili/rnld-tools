import { dateStringValidator, limitValidator, pageValidator } from '@workspace/constants';
import { z } from 'zod';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const loanInstallmentParamSchema = z.object({
  loanId: z.string().trim().length(25),
  installmentId: z.string().trim().length(25),
});

export const loanInstallmentLoanIdParamSchema = z.object({
  loanId: z.string().trim().length(25),
});

export const installmentUpdateSchema = z.object({
  dueDate: dateStringValidator.optional(),
  amount: z.number().positive().optional(),
  remarks: z.string().trim().optional().nullable(),
});

export const installmentAddSchema = z.object({
  dueDate: dateStringValidator,
  amount: z.number().positive(),
  remarks: z.string().trim().optional().nullable(),
});

export const installmentMarkPaidSchema = z.object({
  paidAt: dateStringValidator.optional(),
});

export const loanInstallmentPaymentParamSchema = loanInstallmentParamSchema.extend({
  paymentId: z.string().trim().refine((value) => value.length === 25 || uuidPattern.test(value), {
    message: 'Invalid payment ID',
  }),
});

export const installmentPaymentRecordSchema = z.object({
  paymentDate: dateStringValidator,
  cashAmount: z.number().min(0),
  applyAvailableExcess: z.boolean().default(false),
  remarks: z.string().trim().optional().nullable(),
});

export const installmentPaymentVoidSchema = z.object({
  voidReason: z.string().trim().min(1),
});

export const installmentPaymentsQuerySchema = z.object({
  page: pageValidator,
  limit: limitValidator,
});
