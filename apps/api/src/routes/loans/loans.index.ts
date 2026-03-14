import { createLoan, deleteLoan, getLoan, getLoans, updateLoan } from './loans.handler';
import installmentsRoute from './installments/installments.index';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';

const loansRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/', ...getLoans)
  .get('/:id', ...getLoan)
  .post('/', ...createLoan)
  .put('/:id', ...updateLoan)
  .delete('/:id', ...deleteLoan)
  .route('/:loanId/installments', installmentsRoute);

export default loansRoute;
