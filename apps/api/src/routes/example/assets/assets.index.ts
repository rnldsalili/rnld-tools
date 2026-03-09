import { bodyLimit } from 'hono/body-limit';
import { uploadAsset } from './assets.handler';
import { createRouter } from '@/api/app';
import { requireAuth } from '@/api/middlewares/auth.middleware';


const assetsRoute = createRouter()
    .use('*', requireAuth)
    .use('*', bodyLimit({ maxSize: 5 * 1024 * 1024 })) // 5MB limit
    .post('/', ...uploadAsset);

export default assetsRoute;
