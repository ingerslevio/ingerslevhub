import type { FastifyPluginAsync } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import * as aulaService from '../services/aula-service.js';
import { config } from '../config.js';

const saveTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

function getApiBase(request: { headers: Record<string, string | string[] | undefined>; protocol: string; hostname: string }): string {
  const proto = (request.headers['x-forwarded-proto'] as string | undefined) ?? request.protocol;
  const host = (request.headers['x-forwarded-host'] as string | undefined) ?? request.hostname;
  return `${proto}://${host}`;
}

const aulaRoutes: FastifyPluginAsync = async (fastify) => {
  // ── OAuth flow ──────────────────────────────────────────────────────────────

  fastify.get('/auth', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state = randomBytes(16).toString('hex');

    const redirectUri = `${getApiBase(request)}/api/aula/auth/callback`;

    // Store verifier+state+userId in a short-lived signed cookie.
    // Cast to any because FastifyJWT types constrain payload to { userId }.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookiePayload = fastify.jwt.sign(
      { state, verifier, userId: request.currentUser.id, redirectUri } as any,
      { expiresIn: '10m' },
    );
    reply.setCookie('aula_oauth', cookiePayload, {
      path: '/api/aula/auth/callback',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 600,
    });

    return reply.redirect(aulaService.buildAuthUrl(redirectUri, challenge, state));
  });

  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/auth/callback',
    async (request, reply) => {
      const frontendBase = config.FRONTEND_URL || `${request.protocol}://${request.hostname}`;
      const { code, state, error } = request.query;

      if (error || !code || !state) {
        return reply.redirect(`${frontendBase}/aula?error=aula_auth_failed`);
      }

      const cookieRaw = request.cookies['aula_oauth'];
      if (!cookieRaw) {
        return reply.redirect(`${frontendBase}/aula?error=aula_state_missing`);
      }

      let payload: { state: string; verifier: string; userId: string; redirectUri: string };
      try {
        payload = fastify.jwt.verify<{ state: string; verifier: string; userId: string; redirectUri: string }>(cookieRaw);
      } catch {
        return reply.redirect(`${frontendBase}/aula?error=aula_state_invalid`);
      }

      if (payload.state !== state) {
        return reply.redirect(`${frontendBase}/aula?error=aula_state_mismatch`);
      }

      reply.clearCookie('aula_oauth', { path: '/api/aula/auth/callback' });

      try {
        const { accessToken, refreshToken, expiresAt } = await aulaService.exchangeCode(
          code,
          payload.verifier,
          payload.redirectUri,
        );
        await aulaService.upsertToken(payload.userId, accessToken, refreshToken, expiresAt);
        return reply.redirect(`${frontendBase}/aula?connected=true`);
      } catch (err) {
        fastify.log.error(err, 'Aula token exchange failed');
        return reply.redirect(`${frontendBase}/aula?error=aula_token_exchange_failed`);
      }
    },
  );

  // ── Token management (require auth) ────────────────────────────────────────

  fastify.get('/token', { preHandler: [fastify.authenticate] }, async (request) => {
    const token = await aulaService.getToken(request.currentUser.id);
    if (!token) return null;
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    };
  });

  fastify.post('/token', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parsed = saveTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Ugyldig forespørgsel' });
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

  fastify.delete('/token', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    await aulaService.deleteToken(request.currentUser.id);
    return reply.status(204).send();
  });

  fastify.get('/token/verify', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const token = await aulaService.getToken(request.currentUser.id);
    if (!token) return reply.status(404).send({ error: 'Ingen token gemt' });
    const result = await aulaService.verifyToken(token.accessToken);
    return result;
  });
};

export default aulaRoutes;
