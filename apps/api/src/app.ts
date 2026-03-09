import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createFactory } from 'hono/factory';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';

import type { auth } from '@/api/lib/auth';

export type AppVariables = {
  user: AuthUser;
  requestId: string;
};

export type AppBindings = {
  Bindings: CloudflareBindings;
  Variables: AppVariables;
};

export type AuthSession = Awaited<ReturnType<ReturnType<typeof auth>['api']['getSession']>>;
export type AuthUser = NonNullable<AuthSession>['user'];

export const createRouter = () => {
  return new Hono<AppBindings>();
};

const factory = createFactory<AppBindings>();
export const createMiddleware = factory.createMiddleware;
export const createHandlers = factory.createHandlers;

export const createApp = () => {
  const app = createRouter().basePath('/api');

  app.use(
    rateLimiter<AppBindings>({
      binding: (c) => c.env.RATE_LIMITER,
      keyGenerator: (c) => c.req.header('cf-connecting-ip') ?? '',
      handler: (c) => {
        return c.json({
          meta: {
            code: 429,
            message: 'Internal Server Error',
          },
          data: {},
        }, 429);
      },
    }),
  );

  app.use('*', logger());

  app.notFound((c) => {
    return c.json({
      meta: {
        code: 404,
        message: 'Not Found',
      },
      data: {},
    }, 404);
  });

  app.onError((_, c) => {
    return c.json({
      meta: {
        code: 500,
        message: 'Internal Server Error',
      },
      data: {},
    }, 500);
  });

  app.use('*', cors({
    origin: (origin, c) => {
      const allowedOrigins = c.env.CORS_ORIGINS.split(',').map((o: string) => o.trim());

      if (!origin) return null;

      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  return app;
};
