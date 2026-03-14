import { UserRole } from '@workspace/constants';
import { createMiddleware } from 'hono/factory';

import type { AppBindings } from '@/api/app';

export const requireAdminRole = createMiddleware<AppBindings>(async (c, next) => {
  const user = c.get('user');

  const isAdmin = user.role === UserRole.ADMIN;
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

  if (!user.role || (!isAdmin && !isSuperAdmin)) {
    return c.json({
      meta: {
        code: 403,
        message: 'Forbidden',
      },
    }, 403);
  }

  await next();
});
