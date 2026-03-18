import { createApp } from './app';
import { processNotificationQueueBatch } from './lib/notifications/queue';
import { registerRoutes } from './routes';
import type { NotificationEnv } from './lib/notifications/types';

const app = registerRoutes(createApp());

export default {
  fetch: app.fetch,
  async queue(batch, env) {
    await processNotificationQueueBatch(batch, env);
  },
} satisfies ExportedHandler<NotificationEnv>;
