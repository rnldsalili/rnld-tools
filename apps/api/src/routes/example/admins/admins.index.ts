import {
  createAdmin,
  getAdmin,
  getAdmins,
  updateAdmin,
  updateAdminPassword,
} from './admins.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireSuperAdmin } from '@/api/middlewares/super-admin.middleware';


const adminsRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireSuperAdmin)
  .get('/', ...getAdmins)
  .get('/:id', ...getAdmin)
  .post('/', ...createAdmin)
  .put('/:id', ...updateAdmin)
  .put('/:id/password', ...updateAdminPassword);

export default adminsRoute;
