import { deleteInstallment, updateInstallment } from './installments.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';

const installmentsRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .put('/:installmentId', ...updateInstallment)
  .delete('/:installmentId', ...deleteInstallment);

export default installmentsRoute;
