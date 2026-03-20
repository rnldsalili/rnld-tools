import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { getLoanLogs } from './logs.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const loanLogsRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getLoanLogs);

export default loanLogsRoute;
