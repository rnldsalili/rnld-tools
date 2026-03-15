import { getPublicDocument, signPublicDocument } from './public-document.handler';
import { createRouter } from '@/api/app';

const publicDocumentsRoute = createRouter()
  .get('/:token', ...getPublicDocument)
  .post('/:token/sign', ...signPublicDocument);

export default publicDocumentsRoute;
