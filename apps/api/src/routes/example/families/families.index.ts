import {
  createFamily,
  getFamilies,
  getFamily,
  getFamilyOptions,
  updateFamily,
} from './families.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';


const familiesRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/', ...getFamilies)
  .get('/options', ...getFamilyOptions)
  .get('/:id', ...getFamily)
  .post('/', ...createFamily)
  .put('/:id', ...updateFamily);

export default familiesRoute;
