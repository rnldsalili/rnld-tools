import { createApp } from '@/api/app';
import clientsRoute from '@/api/routes/clients/clients.index';
import dashboardRoute from '@/api/routes/dashboard/dashboard.index';
import documentsRoute from '@/api/routes/documents/documents.index';
import authRoutes from '@/api/routes/auth/auth.index';
import healthRoute from '@/api/routes/health/health.index';
import loansRoute from '@/api/routes/loans/loans.index';
import notificationsRoute from '@/api/routes/notifications/notifications.index';
import rolesRoute from '@/api/routes/roles/roles.index';
import seedRoute from '@/api/routes/seed/seed.index';
import usersRoute from '@/api/routes/users/users.index';


// import exampleRoutes from '@/api/routes/example/example.index';

export function registerRoutes(app: ReturnType<typeof createApp>) {
  return app
    // .route('/example', exampleRoutes)
    .route('/auth', authRoutes)
    .route('/health', healthRoute)
    .route('/seed', seedRoute)
    .route('/dashboard', dashboardRoute)
    .route('/clients', clientsRoute)
    .route('/loans', loansRoute)
    .route('/documents', documentsRoute)
    .route('/notifications', notificationsRoute)
    .route('/roles', rolesRoute)
    .route('/users', usersRoute);
}

// Stand alone router type used for api client
export const router = registerRoutes(createApp());

export type AppType = typeof router;
