import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { getCurrentUser, getUsers, updateUserRoles } from './users.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const usersRoute = createRouter()
  .use('*', requireAuth)
  .get('/me', ...getCurrentUser)
  .get('/', authorize(PermissionModule.USERS, PermissionAction.VIEW), ...getUsers)
  .put('/:id/roles', authorize(PermissionModule.USERS, PermissionAction.ASSIGN_ROLES), ...updateUserRoles);

export default usersRoute;
