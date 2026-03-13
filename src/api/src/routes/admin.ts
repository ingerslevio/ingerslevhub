import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { hashPassword } from './auth.js';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(1).optional(),
  role: z.enum(['user', 'admin']).optional().default('user'),
});

const updateUserSchema = z.object({
  approved: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional(),
  name: z.string().min(1).max(200).optional(),
});

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // Admin-only guard
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.currentUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  });

  // GET all users
  fastify.get('/users', async () => {
    const allUsers = await db.select().from(users).orderBy(users.createdAt);
    return allUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      role: u.role,
      approved: u.approved,
      createdAt: u.createdAt,
    }));
  });

  // POST create user
  fastify.post('/users', async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { email, name, password, role } = parsed.data;

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Email already exists' });
    }

    const [created] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash: password ? hashPassword(password) : null,
        role,
        approved: true,
      })
      .returning();

    return reply.status(201).send({
      id: created!.id,
      email: created!.email,
      name: created!.name,
      avatarUrl: created!.avatarUrl,
      role: created!.role,
      approved: created!.approved,
      createdAt: created!.createdAt,
    });
  });

  // PATCH update user
  fastify.patch<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.approved !== undefined) updateData.approved = parsed.data.approved;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, request.params.id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      approved: updated.approved,
      createdAt: updated.createdAt,
    };
  });

  // DELETE user
  fastify.delete<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const result = await db
      .delete(users)
      .where(eq(users.id, request.params.id))
      .returning();

    if (result.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.status(204).send();
  });
};

export default adminRoutes;
