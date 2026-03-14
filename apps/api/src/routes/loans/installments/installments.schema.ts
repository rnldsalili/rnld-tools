import { z } from 'zod';

import { INSTALLMENT_STATUSES, dateStringValidator } from '@workspace/constants';

export const loanInstallmentParamSchema = z.object({
  loanId: z.string().trim().length(25),
  installmentId: z.string().trim().length(25),
});

export const installmentUpdateSchema = z.object({
  dueDate: dateStringValidator.optional(),
  status: z.enum(INSTALLMENT_STATUSES).optional(),
  remarks: z.string().trim().optional().nullable(),
});
