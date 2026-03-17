import { createClient, getClient, getClients, updateClient } from './clients.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';

const clientsRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/', ...getClients)
  .post('/', ...createClient)
  .get('/:id', ...getClient)
  .put('/:id', ...updateClient);

export default clientsRoute;
