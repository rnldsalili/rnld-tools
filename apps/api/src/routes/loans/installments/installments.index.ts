import { PermissionAction, PermissionModule } from '@workspace/permissions';
import {
  addInstallment,
  deleteInstallment,
  getInstallmentPayments,
  recordInstallmentPayment,
  updateInstallment,
  voidInstallmentPayment,
} from './installments.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const installmentsRoute = createRouter()
  .use('*', requireAuth)
  .post('/', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...addInstallment)
  .put('/:installmentId', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...updateInstallment)
  .delete('/:installmentId', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...deleteInstallment)
  .get('/:installmentId/payments', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getInstallmentPayments)
  .post('/:installmentId/payments', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...recordInstallmentPayment)
  .post('/:installmentId/payments/:paymentId/void', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...voidInstallmentPayment);

export default installmentsRoute;
