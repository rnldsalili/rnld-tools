import { PermissionAction, PermissionModule } from '@workspace/permissions';
import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationEventConfigs,
  getNotificationLogById,
  getNotificationLogs,
  getNotificationTemplateById,
  getNotificationTemplates,
  renderNotificationTemplatePreview,
  testSendNotification,
  updateNotificationEventConfig,
  updateNotificationTemplate,
} from './notifications.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { authorize } from '@/api/middlewares/authorization.middleware';

const notificationsRoute = createRouter()
  .use('*', requireAuth)
  .get('/templates', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW), ...getNotificationTemplates)
  .post('/templates', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.MANAGE), ...createNotificationTemplate)
  .get('/templates/:id', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW), ...getNotificationTemplateById)
  .put('/templates/:id', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.MANAGE), ...updateNotificationTemplate)
  .delete('/templates/:id', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.MANAGE), ...deleteNotificationTemplate)
  .get('/event-configs', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW), ...getNotificationEventConfigs)
  .get('/logs', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW), ...getNotificationLogs)
  .get('/logs/:id', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW), ...getNotificationLogById)
  .post('/render-preview', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW), ...renderNotificationTemplatePreview)
  .put('/event-configs/:event/:channel', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.MANAGE), ...updateNotificationEventConfig)
  .post('/test-send', authorize(PermissionModule.NOTIFICATIONS, PermissionAction.MANAGE), ...testSendNotification);

export default notificationsRoute;
