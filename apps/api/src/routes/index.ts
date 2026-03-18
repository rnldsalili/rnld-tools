import { createApp } from '@/api/app';
import clientsRoute from '@/api/routes/clients/clients.index';
import documentsRoute from '@/api/routes/documents/documents.index';
import authRoutes from '@/api/routes/auth/auth.index';
import healthRoute from '@/api/routes/health/health.index';
import loansRoute from '@/api/routes/loans/loans.index';
import notificationsRoute from '@/api/routes/notifications/notifications.index';
import seedRoute from '@/api/routes/seed/seed.index';


// import exampleRoutes from '@/api/routes/example/example.index';

export function registerRoutes(app: ReturnType<typeof createApp>) {
  return app
    // .route('/example', exampleRoutes)
    .route('/auth', authRoutes)
    .route('/health', healthRoute)
    .route('/seed', seedRoute)
    .route('/clients', clientsRoute)
    .route('/loans', loansRoute)
    .route('/documents', documentsRoute)
    .route('/notifications', notificationsRoute);
}

// Stand alone router type used for api client
export const router = registerRoutes(createApp());

export type AppType = typeof router;
