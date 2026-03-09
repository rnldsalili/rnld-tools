import { createRouter } from '@/api/app';
import dashboardRoute from '@/api/routes/example/dashboard/dashboard.index';
import familiesRoute from '@/api/routes/example/families/families.index';
import membersRoute from '@/api/routes/example/members/members.index';
import adminsRoute from '@/api/routes/example/admins/admins.index';
import accountRoute from '@/api/routes/example/account/account.index';
import assetsRoute from '@/api/routes/example/assets/assets.index';

const adminRoute = createRouter()
  .route('/dashboard', dashboardRoute)
  .route('/members', membersRoute)
  .route('/families', familiesRoute)
  .route('/admins', adminsRoute)
  .route('/account', accountRoute)
  .route('/assets', assetsRoute);

export default adminRoute;
