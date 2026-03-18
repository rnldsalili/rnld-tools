import { createMiddleware } from 'hono/factory';

import type { PermissionAction, PermissionModule } from '@workspace/permissions';
import type { AppBindings } from '@/api/app';
import { buildAbilityForUser } from '@/api/lib/authorization';

export function authorize(module: PermissionModule, action: PermissionAction) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const user = c.get('user');
    const ability = buildAbilityForUser(user);

    if (!ability.can(action, module)) {
      return c.json({
        meta: {
          code: 403,
          message: 'Forbidden',
        },
      }, 403);
    }

    await next();
  });
}
