import { z } from 'zod';

import { dateStringValidator } from '@workspace/constants';

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
