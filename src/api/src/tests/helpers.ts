import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import corsPlugin from '../plugins/cors.js';
import authPlugin from '../plugins/auth.js';
import authRoutes from '../routes/auth.js';
import mealsRoutes from '../routes/meals.js';
import homeworkRoutes from '../routes/homework.js';
import calendarRoutes from '../routes/calendar.js';
import recipesRoutes from '../routes/recipes.js';
import groceriesRoutes from '../routes/groceries.js';

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(fastifyCookie);
  await app.register(corsPlugin);
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(mealsRoutes, { prefix: '/api/meals' });
  await app.register(homeworkRoutes, { prefix: '/api/homework' });
  await app.register(calendarRoutes, { prefix: '/api/calendar' });
  await app.register(recipesRoutes, { prefix: '/api/recipes' });
  await app.register(groceriesRoutes, { prefix: '/api/groceries' });

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.ready();
  return app;
}
