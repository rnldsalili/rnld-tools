import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { createRole, deleteRole, getRole, getRoles, updateRole } from './roles.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const rolesRoute = createRouter()
  .use('*', requireAuth)
  .get('/', authorize(PermissionModule.ROLES, PermissionAction.VIEW), ...getRoles)
  .post('/', authorize(PermissionModule.ROLES, PermissionAction.CREATE), ...createRole)
  .get('/:id', authorize(PermissionModule.ROLES, PermissionAction.VIEW), ...getRole)
  .put('/:id', authorize(PermissionModule.ROLES, PermissionAction.UPDATE), ...updateRole)
  .delete('/:id', authorize(PermissionModule.ROLES, PermissionAction.DELETE), ...deleteRole);

export default rolesRoute;
