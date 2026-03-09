import { createMiddleware } from 'hono/factory';

import { UserRole } from '@workspace/constants';
import type { AppBindings } from '@/api/app';

export const requireSuperAdmin = createMiddleware<AppBindings>(async (c, next) => {
  const user = c.get('user');

  if (user.role !== UserRole.SUPER_ADMIN) {
    return c.json({
      meta: {
        code: 403,
        message: 'Forbidden',
      },
      data: {},
    }, 403);
  }

  await next();
});
