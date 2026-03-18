import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { downloadLoanDocumentPdf } from './documents.handler';
import { createRouter } from '@/api/app';
import { authorize } from '@/api/middlewares/authorization.middleware';

const loanDocumentsRoute = createRouter()
  .get('/:templateId/pdf', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...downloadLoanDocumentPdf);

export default loanDocumentsRoute;
