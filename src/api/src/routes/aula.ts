import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as aulaService from '../services/aula-service.js';

const saveTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const aulaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET current user's Aula token
  fastify.get('/token', async (request) => {
    const token = await aulaService.getToken(request.currentUser.id);
    if (!token) {
      return null;
    }
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    };
  });

  // POST save/update Aula token
  fastify.post('/token', async (request, reply) => {
    const parsed = saveTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Ugyldig forespørgsel', details: parsed.error.issues });
    }
    const { accessToken, refreshToken, expiresAt } = parsed.data;
    const token = await aulaService.upsertToken(
      request.currentUser.id,
      accessToken,
      refreshToken ?? null,
      expiresAt ? new Date(expiresAt) : null,
    );
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    };
  });

  // DELETE remove Aula token
  fastify.delete('/token', async (request, reply) => {
    await aulaService.deleteToken(request.currentUser.id);
    return reply.status(204).send();
  });

  // GET verify token by calling Aula API
  fastify.get('/token/verify', async (request, reply) => {
    const token = await aulaService.getToken(request.currentUser.id);
    if (!token) {
      return reply.status(404).send({ error: 'Ingen token gemt' });
    }
    const result = await aulaService.verifyToken(token.accessToken);
    return result;
  });
};

export default aulaRoutes;
