import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { config } from './config.js';
import corsPlugin from './plugins/cors.js';
import swaggerPlugin from './plugins/swagger.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import mealsRoutes from './routes/meals.js';
import homeworkRoutes from './routes/homework.js';
import calendarRoutes from './routes/calendar.js';
import recipesRoutes from './routes/recipes.js';
import groceriesRoutes from './routes/groceries.js';

const app = Fastify({ logger: true });

async function start() {
  await app.register(fastifyCookie);
  await app.register(corsPlugin);
  await app.register(swaggerPlugin);
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(mealsRoutes, { prefix: '/api/meals' });
  await app.register(homeworkRoutes, { prefix: '/api/homework' });
  await app.register(calendarRoutes, { prefix: '/api/calendar' });
  await app.register(recipesRoutes, { prefix: '/api/recipes' });
  await app.register(groceriesRoutes, { prefix: '/api/groceries' });

  app.get('/api/health', async () => ({ status: 'ok' }));

  if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const { default: fastifyStatic } = await import('@fastify/static');
    await app.register(fastifyStatic, {
      root: path.join(__dirname, '../../public'),
      prefix: '/',
    });
    app.setNotFoundHandler(async (_request, reply) => {
      return reply.sendFile('index.html');
    });
  }

  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  app.log.info(`Server listening on port ${config.API_PORT}`);
}

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully...`);
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
