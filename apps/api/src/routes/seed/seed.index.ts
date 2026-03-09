import { createRouter } from '@/api/app';
import { seedDatabase } from '@/api/routes/seed/seed.handler';

const seedRoute = createRouter()
  .post('/', ...seedDatabase);

export default seedRoute;
