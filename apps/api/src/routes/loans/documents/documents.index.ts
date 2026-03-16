import { downloadLoanDocumentPdf } from './documents.handler';
import { createRouter } from '@/api/app';

const loanDocumentsRoute = createRouter()
  .get('/:templateId/pdf', ...downloadLoanDocumentPdf);

export default loanDocumentsRoute;
