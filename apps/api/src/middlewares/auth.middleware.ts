import { auth } from '@/api/lib/auth';
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
      data: {},
    }, 401);
  }

  c.set('user', session.user);
  await next();
});
