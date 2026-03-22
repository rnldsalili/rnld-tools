import { limitValidator, pageValidator } from '@workspace/constants';
import { z } from 'zod';

export const loanIdParamSchema = z.object({
  loanId: z.string().trim().length(25),
});

export const userIdParamSchema = z.object({
  userId: z.string().trim(),
});

export const loanAssignmentListQuerySchema = z.object({
  page: pageValidator,
  limit: limitValidator,
});

export const loanAssignmentCreateSchema = z.object({
  userId: z.string().trim(),
});
