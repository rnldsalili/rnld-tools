import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';

export const validate = <T extends ZodType, TTarget extends keyof ValidationTargets>(
  target: TTarget,
  schema: T,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({
        meta: {
          code: 422,
          message: 'Validation failed',
        },
        data: {
          name: result.error.name,
          message: result.error.message,
        },
      }, 422);
    }
  });
