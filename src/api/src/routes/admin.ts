import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, apiKeys, families, familyMembers, students } from '../db/schema.js';
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
  password: z.string().min(1).optional(),
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
    if (parsed.data.password !== undefined) updateData.passwordHash = hashPassword(parsed.data.password);

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

  // GET all families with members
  fastify.get('/families', async () => {
    const allFamilies = await db.select().from(families).orderBy(families.createdAt);
    const allMembers = await db
      .select({ familyId: familyMembers.familyId, userId: familyMembers.userId, role: familyMembers.role, familyRole: familyMembers.familyRole })
      .from(familyMembers);
    return allFamilies.map(f => ({
      ...f,
      members: allMembers.filter(m => m.familyId === f.id),
    }));
  });

  // POST move user to a family (removes from current family first)
  fastify.post<{ Params: { familyId: string } }>('/families/:familyId/members', async (request, reply) => {
    const body = z.object({
      userId: z.string().uuid(),
      role: z.enum(['owner', 'member']).optional().default('member'),
      familyRole: z.enum(['adult', 'child']).optional().default('adult'),
    }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed' });

    const { userId, role, familyRole } = body.data;
    const { familyId } = request.params;

    // Verify family exists
    const [family] = await db.select().from(families).where(eq(families.id, familyId)).limit(1);
    if (!family) return reply.status(404).send({ error: 'Family not found' });

    // Verify user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return reply.status(404).send({ error: 'User not found' });

    // Remove from any existing family
    await db.delete(familyMembers).where(eq(familyMembers.userId, userId));

    // Add to new family
    const [member] = await db.insert(familyMembers).values({ familyId, userId, role, familyRole }).returning();
    return reply.status(201).send(member);
  });

  // DELETE remove user from their family
  fastify.delete<{ Params: { userId: string } }>('/families/members/:userId', async (request, reply) => {
    await db.delete(familyMembers).where(eq(familyMembers.userId, request.params.userId));
    return reply.status(204).send();
  });

  // POST migrate all data from one family to another
  fastify.post('/families/migrate', async (request, reply) => {
    const body = z.object({ fromFamilyId: z.string().uuid(), toFamilyId: z.string().uuid() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed' });

    const { fromFamilyId, toFamilyId } = body.data;

    // Move students
    const movedStudents = await db
      .update(students)
      .set({ familyId: toFamilyId })
      .where(eq(students.familyId, fromFamilyId))
      .returning({ id: students.id, name: students.name });

    return { movedStudents };
  });

  // GET all students
  fastify.get('/students', async () => {
    return db.select().from(students).orderBy(students.name);
  });

  // PATCH update student (link to user)
  fastify.patch<{ Params: { id: string } }>('/students/:id', async (request, reply) => {
    const body = z.object({ userId: z.string().uuid().optional(), name: z.string().min(1).optional() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed' });

    const updateData: Record<string, unknown> = {};
    if (body.data.userId !== undefined) updateData.userId = body.data.userId;
    if (body.data.name !== undefined) updateData.name = body.data.name;

    const [updated] = await db.update(students).set(updateData).where(eq(students.id, request.params.id)).returning();
    if (!updated) return reply.status(404).send({ error: 'Student not found' });
    return updated;
  });

  // GET all API keys
  fastify.get('/api-keys', async () => {
    const rows = await db
      .select({ id: apiKeys.id, name: apiKeys.name, key: apiKeys.key, userId: apiKeys.userId, createdAt: apiKeys.createdAt })
      .from(apiKeys)
      .orderBy(apiKeys.createdAt);
    return rows;
  });

  // POST create API key
  fastify.post('/api-keys', async (request, reply) => {
    const body = z.object({ name: z.string().min(1).max(200), userId: z.string().uuid() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed' });
    const [created] = await db.insert(apiKeys).values({ name: body.data.name, userId: body.data.userId }).returning();
    return reply.status(201).send(created);
  });

  // DELETE API key
  fastify.delete<{ Params: { id: string } }>('/api-keys/:id', async (request, reply) => {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, request.params.id)).returning();
    if (result.length === 0) return reply.status(404).send({ error: 'API key not found' });
    return reply.status(204).send();
  });
};

export default adminRoutes;
