import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationEventConfigs,
  getNotificationLogById,
  getNotificationLogs,
  getNotificationTemplateById,
  getNotificationTemplates,
  testSendNotification,
  updateNotificationEventConfig,
  updateNotificationTemplate,
} from './notifications.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdminRole } from '@/api/middlewares/role.middleware';

const notificationsRoute = createRouter()
  .use('*', requireAuth)
  .use('*', requireAdminRole)
  .get('/templates', ...getNotificationTemplates)
  .post('/templates', ...createNotificationTemplate)
  .get('/templates/:id', ...getNotificationTemplateById)
  .put('/templates/:id', ...updateNotificationTemplate)
  .delete('/templates/:id', ...deleteNotificationTemplate)
  .get('/event-configs', ...getNotificationEventConfigs)
  .get('/logs', ...getNotificationLogs)
  .get('/logs/:id', ...getNotificationLogById)
  .put('/event-configs/:event/:channel', ...updateNotificationEventConfig)
  .post('/test-send', ...testSendNotification);

export default notificationsRoute;
