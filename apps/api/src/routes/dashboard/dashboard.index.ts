import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';
import { getDashboardSummary } from '@/api/routes/dashboard/dashboard.handler';

const dashboardRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.DASHBOARD, PermissionAction.VIEW), ...getDashboardSummary);

export default dashboardRoute;
