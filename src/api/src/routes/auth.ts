import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { config } from '../config.js';
import { getAuthUrl, exchangeCode } from '../services/google-auth.js';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

const passwordLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
        return reply.redirect(`${config.FRONTEND_URL || '/'}?error=auth_failed`);
      }

      try {
        const { accessToken, refreshToken, profile } = await exchangeCode(code);

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.googleId, profile.googleId))
          .limit(1);

        let userId: string;
        let userApproved: boolean;
        let userRole: string;

        if (existing.length > 0) {
          const existingUser = existing[0]!;
          userId = existingUser.id;
          userApproved = existingUser.approved;
          userRole = existingUser.role;

          await db
            .update(users)
            .set({
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              accessToken,
              ...(refreshToken ? { refreshToken } : {}),
            })
            .where(eq(users.id, userId));

          // Admin users always allowed
          if (userRole !== 'admin' && !userApproved) {
            return reply.redirect(`${config.FRONTEND_URL || '/'}?error=not_approved`);
          }
        } else {
          // New user - check if this is the admin email
          const isAdminEmail = profile.email === 'emil@ingerslev.io';
          const [created] = await db
            .insert(users)
            .values({
              googleId: profile.googleId,
              email: profile.email,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              accessToken,
              refreshToken,
              approved: isAdminEmail,
              role: isAdminEmail ? 'admin' : 'user',
            })
            .returning();
          userId = created!.id;
          userApproved = created!.approved;
          userRole = created!.role;

          if (userRole !== 'admin' && !userApproved) {
            return reply.redirect(`${config.FRONTEND_URL || '/'}?error=not_approved`);
          }
        }

        const token = fastify.jwt.sign({ userId }, { expiresIn: '7d' });

        reply.setCookie('session', token, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env['NODE_ENV'] === 'production',
          maxAge: 60 * 60 * 24 * 7,
        });

        return reply.redirect(config.FRONTEND_URL || '/');
      } catch (err) {
        fastify.log.error(err, 'OAuth callback failed');
        return reply.redirect(`${config.FRONTEND_URL || '/'}?error=auth_failed`);
      }
    },
  );

  fastify.post('/password', async (request, reply) => {
    const parsed = passwordLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed' });
    }

    const { email, password } = parsed.data;

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userRows.length === 0) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const user = userRows[0]!;

    if (!user.passwordHash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    if (user.role !== 'admin' && !user.approved) {
      return reply.status(403).send({ error: 'not_approved' });
    }

    const token = fastify.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    reply.setCookie('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      approved: user.approved,
      createdAt: user.createdAt,
    };
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = request.currentUser;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      apiKey: user.apiKey,
      selectedCalendarId: user.selectedCalendarId,
      selectedCalendarIds: user.selectedCalendarIds,
      createdAt: user.createdAt,
      role: user.role,
      approved: user.approved,
    };
  });

  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('session', { path: '/' });
    return { ok: true };
  });
};

export { hashPassword };
export default authRoutes;
