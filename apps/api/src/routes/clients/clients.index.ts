import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { createClient, getClient, getClientLoans, getClients, updateClient } from './clients.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const clientsRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.CLIENTS, PermissionAction.VIEW), ...getClients)
  .post('/', authorize(PermissionModule.CLIENTS, PermissionAction.CREATE), ...createClient)
  .get('/:id/loans', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getClientLoans)
  .get('/:id', authorize(PermissionModule.CLIENTS, PermissionAction.VIEW), ...getClient)
  .put('/:id', authorize(PermissionModule.CLIENTS, PermissionAction.UPDATE), ...updateClient);

export default clientsRoute;
