import { createApp } from './app';
import { registerRoutes } from './routes';

const app = registerRoutes(createApp());

export default app;
