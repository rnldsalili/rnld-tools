import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { addInstallment, deleteInstallment, markInstallmentPaid, updateInstallment } from './installments.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const installmentsRoute = createRouter()
  .use('*', requireAuth)
  .post('/', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...addInstallment)
  .put('/:installmentId', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...updateInstallment)
  .delete('/:installmentId', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...deleteInstallment)
  .post('/:installmentId/mark-paid', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...markInstallmentPaid);

export default installmentsRoute;
