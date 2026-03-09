import {
  createMember,
  getMember,
  getMemberOptions,
  getMembers,
  updateMember,
} from './members.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';


const membersRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/', ...getMembers)
  .get('/options', ...getMemberOptions)
  .get('/:id', ...getMember)
  .post('/', ...createMember)
  .put('/:id', ...updateMember);

export default membersRoute;
