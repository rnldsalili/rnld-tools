import { createDocumentLink, deleteDocumentLink, getDocumentLinks } from './document-links.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';

const documentLinksRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/', ...getDocumentLinks)
  .post('/', ...createDocumentLink)
  .delete('/:token', ...deleteDocumentLink);

export default documentLinksRoute;
