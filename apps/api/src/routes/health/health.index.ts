import { createRouter } from '@/api/app';

const healthRoute = createRouter()
  .get('/', (c) => {
        return c.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });

export default healthRoute;
