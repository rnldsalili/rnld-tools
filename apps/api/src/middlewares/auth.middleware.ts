import { auth } from '@/api/lib/auth';
import { getAuthenticatedUser } from '@/api/lib/authorization';
import { initializePrisma } from '@/api/lib/db';
import { createMiddleware } from '@/api/app';

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
  await next();
});
