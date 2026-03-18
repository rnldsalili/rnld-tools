import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { getLoanDocumentLogs } from './document-logs.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const documentLogsRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getLoanDocumentLogs);

export default documentLogsRoute;
