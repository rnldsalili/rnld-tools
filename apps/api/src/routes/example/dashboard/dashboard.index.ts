import { getDashboardSummary } from './dashboard.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';


const dashboardRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/summary', ...getDashboardSummary);

export default dashboardRoute;
