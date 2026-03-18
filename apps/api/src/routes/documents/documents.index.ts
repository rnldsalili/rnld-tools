import { PermissionAction, PermissionModule } from '@workspace/permissions';
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
import { authorize } from '@/api/middlewares/authorization.middleware';

const documentsRoute = createRouter()
  .route('/public', publicDocumentsRoute)
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.DOCUMENTS, PermissionAction.VIEW), ...getDocuments)
  .post('/', authorize(PermissionModule.DOCUMENTS, PermissionAction.CREATE), ...createDocument)
  .get('/:id', authorize(PermissionModule.DOCUMENTS, PermissionAction.VIEW), ...getDocumentById)
  .put('/:id', authorize(PermissionModule.DOCUMENTS, PermissionAction.UPDATE), ...updateDocument)
  .delete('/:id', authorize(PermissionModule.DOCUMENTS, PermissionAction.DELETE), ...deleteDocument);

export default documentsRoute;
