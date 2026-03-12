import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Family Hub API',
        version: '1.0.0',
        description: 'API for the Family Hub application',
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
          },
          cookieAuth: {
            type: 'apiKey',
            name: 'session',
            in: 'cookie',
          },
        },
      },
      security: [{ apiKey: [] }, { cookieAuth: [] }],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/api/docs',
  });
}

export default fp(swaggerPlugin, { name: 'swagger' });
