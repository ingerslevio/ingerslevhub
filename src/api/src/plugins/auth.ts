import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { users, apiKeys, families, familyMembers, type User } from '../db/schema.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string };
    user: { userId: string };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: User;
    currentFamilyId: string;
  }
}

async function resolveFamilyId(userId: string): Promise<string> {
  const [membership] = await db
    .select({ familyId: familyMembers.familyId })
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId))
    .limit(1);

  if (membership) return membership.familyId;

  // No family yet — auto-create one
  const [family] = await db
    .insert(families)
    .values({ name: 'Familie' })
    .returning();
  await db.insert(familyMembers).values({ familyId: family!.id, userId, role: 'owner' });
  return family!.id;
}

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: config.SESSION_SECRET,
    cookie: {
      cookieName: 'session',
      signed: false,
    },
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (apiKey) {
      // Check user's own api key
      const [user] = await db.select().from(users).where(eq(users.apiKey, apiKey)).limit(1);
      if (user) {
        request.currentUser = user;
        request.currentFamilyId = await resolveFamilyId(user.id);
        return;
      }
      // Check named api keys
      const [keyRow] = await db.select({ userId: apiKeys.userId }).from(apiKeys).where(eq(apiKeys.key, apiKey)).limit(1);
      if (keyRow) {
        const [keyUser] = await db.select().from(users).where(eq(users.id, keyRow.userId)).limit(1);
        if (keyUser) {
          request.currentUser = keyUser;
          request.currentFamilyId = await resolveFamilyId(keyUser.id);
          return;
        }
      }
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    try {
      await request.jwtVerify();
      const payload = request.user as { userId: string };
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }
      request.currentUser = user;
      request.currentFamilyId = await resolveFamilyId(user.id);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
