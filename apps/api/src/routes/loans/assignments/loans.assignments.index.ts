import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { assignLoanUser, getLoanAssignments, revokeLoanAssignment } from './loans.assignments.handler';
import { createRouter } from '@/api/app';
import { authorize } from '@/api/middlewares/authorization.middleware';
import { requireAuth } from '@/api/middlewares/auth.middleware';

const loanAssignmentsRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.LOANS, PermissionAction.MANAGE), ...getLoanAssignments)
  .post('/', authorize(PermissionModule.LOANS, PermissionAction.MANAGE), ...assignLoanUser)
  .delete('/:userId', authorize(PermissionModule.LOANS, PermissionAction.MANAGE), ...revokeLoanAssignment);

export default loanAssignmentsRoute;
