import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { config } from '../config.js';
import { getAuthUrl, exchangeCode } from '../services/google-auth.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/google', async (_request, reply) => {
    const url = getAuthUrl();
    return reply.redirect(url);
  });

  fastify.get<{ Querystring: { code?: string; error?: string } }>(
    '/google/callback',
    async (request, reply) => {
      const { code, error } = request.query;
      if (error || !code) {
        return reply.redirect(`${config.FRONTEND_URL}?error=auth_failed`);
      }

      try {
        const { accessToken, refreshToken, profile } = await exchangeCode(code);

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.googleId, profile.googleId))
          .limit(1);

        let userId: string;
        if (existing.length > 0) {
          userId = existing[0]!.id;
          await db
            .update(users)
            .set({
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              accessToken,
              refreshToken,
            })
            .where(eq(users.id, userId));
        } else {
          const [created] = await db
            .insert(users)
            .values({
              googleId: profile.googleId,
              email: profile.email,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              accessToken,
              refreshToken,
            })
            .returning();
          userId = created!.id;
        }

        const token = fastify.jwt.sign({ userId }, { expiresIn: '7d' });

        reply.setCookie('session', token, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env['NODE_ENV'] === 'production',
          maxAge: 60 * 60 * 24 * 7,
        });

        return reply.redirect(config.FRONTEND_URL);
      } catch (err) {
        fastify.log.error(err, 'OAuth callback failed');
        return reply.redirect(`${config.FRONTEND_URL}?error=auth_failed`);
      }
    },
  );

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = request.currentUser;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      selectedCalendarId: user.selectedCalendarId,
      createdAt: user.createdAt,
    };
  });

  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('session', { path: '/' });
    return { ok: true };
  });
};

export default authRoutes;
