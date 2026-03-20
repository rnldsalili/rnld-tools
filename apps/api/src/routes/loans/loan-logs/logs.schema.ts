import { limitValidator, pageValidator } from '@workspace/constants';
import { z } from 'zod';

export const loanLogLoanIdParamSchema = z.object({
  loanId: z.string().trim().length(25),
});

export const loanLogsQuerySchema = z.object({
  page: pageValidator,
  limit: limitValidator,
});
