import { PermissionAction, PermissionModule } from '@workspace/permissions';
import {
  changeMyPassword,
  createUser,
  getCurrentUser,
  getUsers,
  updateUser,
  updateUserRoles,
} from './users.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const usersRoute = createRouter()
  .use('*', requireAuth)
  .get('/me', ...getCurrentUser)
  .post('/me/change-password', ...changeMyPassword)
  .get('/', authorize(PermissionModule.USERS, PermissionAction.VIEW), ...getUsers)
  .post('/', authorize(PermissionModule.USERS, PermissionAction.CREATE), ...createUser)
  .put('/:id', authorize(PermissionModule.USERS, PermissionAction.ASSIGN_ROLES), ...updateUser)
  .put('/:id/roles', authorize(PermissionModule.USERS, PermissionAction.ASSIGN_ROLES), ...updateUserRoles);

export default usersRoute;
