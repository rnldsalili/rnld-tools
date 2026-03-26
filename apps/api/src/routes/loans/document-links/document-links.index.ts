import { PermissionAction, PermissionModule } from '@workspace/permissions';
import {
  createDocumentLink,
  deleteDocumentLink,
  getDocumentLinks,
  requestDocumentSignature,
} from './document-links.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const documentLinksRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.LOANS, PermissionAction.VIEW), ...getDocumentLinks)
  .post('/', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...createDocumentLink)
  .post('/request-signature', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...requestDocumentSignature)
  .delete('/:token', authorize(PermissionModule.LOANS, PermissionAction.UPDATE), ...deleteDocumentLink);

export default documentLinksRoute;
