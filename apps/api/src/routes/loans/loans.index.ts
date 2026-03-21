import { PermissionAction, PermissionModule } from '@workspace/permissions';
import loanAttachmentsRoute from './attachments/attachments.index';
import documentLogsRoute from './document-logs/document-logs.index';
import loanDocumentsRoute from './documents/documents.index';
import loanLogsRoute from './loan-logs/logs.index';
import { createLoan, deleteLoan, getLoan, getLoans, updateLoan } from './loans.handler';
import documentLinksRoute from './document-links/document-links.index';
import installmentsRoute from './installments/installments.index';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const loansRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getLoans)
  .get('/:id', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getLoan)
  .post('/', authorize(PermissionModule.LOANS, PermissionAction.CREATE), ...createLoan)
  .put('/:id', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...updateLoan)
  .delete('/:id', authorize(PermissionModule.LOANS, PermissionAction.DELETE), ...deleteLoan)
  .route('/:loanId/attachments', loanAttachmentsRoute)
  .route('/:loanId/installments', installmentsRoute)
  .route('/:loanId/logs', loanLogsRoute)
  .route('/:loanId/document-logs', documentLogsRoute)
  .route('/:loanId/documents', loanDocumentsRoute)
  .route('/:loanId/document-links', documentLinksRoute);

export default loansRoute;
