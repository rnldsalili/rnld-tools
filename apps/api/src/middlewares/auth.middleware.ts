import { auth } from '@/api/lib/auth';
import { getAuthenticatedUser } from '@/api/lib/authorization';
import { initializePrisma } from '@/api/lib/db';
import { createMiddleware } from '@/api/app';

const PASSWORD_CHANGE_ALLOWED_PATHS = new Set([
  '/api/users/me',
  '/api/users/me/change-password',
]);

export const requireAuth = createMiddleware(async (c, next) => {
  const session = await auth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({
      meta: {
        code: 401,
        message: 'Unauthorized',
      },
    }, 401);
  }

  const prisma = initializePrisma(c.env);
  const authenticatedUser = await getAuthenticatedUser(prisma, session.user);

  if (!authenticatedUser) {
    return c.json({
      meta: {
        code: 401,
        message: 'Unauthorized',
      },
    }, 401);
  }

  c.set('user', authenticatedUser);

  if (
    authenticatedUser.mustChangePassword
    && !PASSWORD_CHANGE_ALLOWED_PATHS.has(c.req.path)
  ) {
    return c.json({
      meta: {
        code: 403,
        message: 'Password change required',
      },
    }, 403);
  }

  await next();
});
