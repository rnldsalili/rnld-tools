import { createApp } from './app';
import {
  INSTALLMENT_OVERDUE_STATUS_CRON,
  processInstallmentOverdueStatusSchedule,
  processInstallmentReminderSchedule,
} from './lib/notifications/reminders';
import { processNotificationQueueBatch } from './lib/notifications/queue';
import { registerRoutes } from './routes';
import type { NotificationEnv } from './lib/notifications/types';

const app = registerRoutes(createApp());

export default {
  fetch: app.fetch,
  async scheduled(controller, env) {
    if (controller.cron === INSTALLMENT_OVERDUE_STATUS_CRON) {
      await processInstallmentOverdueStatusSchedule(env, controller.scheduledTime);
      await processInstallmentReminderSchedule(env, controller.scheduledTime);
      return;
    }
  },
  async queue(batch, env) {
    await processNotificationQueueBatch(batch, env);
  },
} satisfies ExportedHandler<NotificationEnv>;
