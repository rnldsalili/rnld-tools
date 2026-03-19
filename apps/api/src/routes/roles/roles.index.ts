import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { getRoles, updateRolePermissions } from './roles.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const rolesRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.ROLES, PermissionAction.VIEW), ...getRoles)
  .put('/:slug/permissions', ...updateRolePermissions);

export default rolesRoute;
