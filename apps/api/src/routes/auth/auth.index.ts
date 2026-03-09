import { createRouter } from '@/api/app';
import { auth } from '@/api/lib/auth';

const authRoute = createRouter()
  .on(['GET', 'POST'], '/*', (c) => {
    return auth(c.env).handler(c.req.raw);
  });

export default authRoute;
