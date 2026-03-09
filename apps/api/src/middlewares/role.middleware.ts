import { ADMIN_ROLES } from '@workspace/constants';
import { createMiddleware } from 'hono/factory';

import type { AppBindings } from '@/api/app';

export const requireAdminRole = createMiddleware<AppBindings>(async (c, next) => {
  const user = c.get('user');

  if (!user.role || !ADMIN_ROLES.includes(user.role)) {
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
