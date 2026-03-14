import { addInstallment, deleteInstallment, markInstallmentPaid, updateInstallment } from './installments.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';

const installmentsRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .post('/', ...addInstallment)
  .put('/:installmentId', ...updateInstallment)
  .delete('/:installmentId', ...deleteInstallment)
  .post('/:installmentId/mark-paid', ...markInstallmentPaid);

export default installmentsRoute;
