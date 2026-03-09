import {
  getAccount,
  updateAccount,
  updateAccountPassword,
} from './account.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';


const accountRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/', ...getAccount)
  .put('/', ...updateAccount)
  .put('/password', ...updateAccountPassword);

export default accountRoute;
