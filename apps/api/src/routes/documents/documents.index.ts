import {
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocuments,
  updateDocument,
} from './documents.handler';
import publicDocumentsRoute from './public/public-document.index';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';

const documentsRoute = createRouter()
  .route('/public', publicDocumentsRoute)
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/', ...getDocuments)
  .post('/', ...createDocument)
  .get('/:id', ...getDocumentById)
  .put('/:id', ...updateDocument)
  .delete('/:id', ...deleteDocument);

export default documentsRoute;
