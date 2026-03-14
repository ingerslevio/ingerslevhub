import type { FastifyPluginAsync } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { families, familyMembers, users, students } from '../db/schema.js';
import { hashPassword } from './auth.js';

const familyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET current user's family
  fastify.get('/', async (request) => {
    const familyId = request.currentFamilyId;
    const [family] = await db.select().from(families).where(eq(families.id, familyId)).limit(1);
    if (!family) return { id: null, name: null, members: [] };

    const members = await db
      .select({
        id: familyMembers.id,
        userId: familyMembers.userId,
        role: familyMembers.role,
        familyRole: familyMembers.familyRole,
        userName: users.name,
        userEmail: users.email,
      })
      .from(familyMembers)
      .innerJoin(users, eq(users.id, familyMembers.userId))
      .where(eq(familyMembers.familyId, familyId));

    return { ...family, members };
  });

  // PATCH update family name
  fastify.patch('/', async (request, reply) => {
    const body = z.object({ name: z.string().min(1).max(200) }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed' });

    // Only adults can edit
    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, request.currentFamilyId), eq(familyMembers.userId, request.currentUser.id)))
      .limit(1);
    if (membership?.familyRole === 'child') return reply.status(403).send({ error: 'Children cannot edit family' });

    const [updated] = await db.update(families).set({ name: body.data.name }).where(eq(families.id, request.currentFamilyId)).returning();
    return updated;
  });

  // PATCH update member familyRole (toggle adult/child)
  fastify.patch<{ Params: { memberId: string } }>('/members/:memberId/role', async (request, reply) => {
    const body = z.object({ familyRole: z.enum(['adult', 'child']) }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed' });

    // Only adults can toggle
    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, request.currentFamilyId), eq(familyMembers.userId, request.currentUser.id)))
      .limit(1);
    if (membership?.familyRole === 'child') return reply.status(403).send({ error: 'Forbidden' });

    const [updated] = await db
      .update(familyMembers)
      .set({ familyRole: body.data.familyRole })
      .where(and(eq(familyMembers.id, request.params.memberId), eq(familyMembers.familyId, request.currentFamilyId)))
      .returning();
    if (!updated) return reply.status(404).send({ error: 'Member not found' });
    return updated;
  });

  // POST set password for a family member (adults only)
  fastify.post<{ Params: { userId: string } }>('/members/:userId/password', async (request, reply) => {
    const body = z.object({ password: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed' });

    // Only adults can set passwords
    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, request.currentFamilyId), eq(familyMembers.userId, request.currentUser.id)))
      .limit(1);
    if (membership?.familyRole === 'child') return reply.status(403).send({ error: 'Forbidden' });

    // Target must be in same family
    const [target] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, request.currentFamilyId), eq(familyMembers.userId, request.params.userId)))
      .limit(1);
    if (!target) return reply.status(404).send({ error: 'Member not found' });

    await db.update(users).set({ passwordHash: hashPassword(body.data.password) }).where(eq(users.id, request.params.userId));
    return { ok: true };
  });

  // POST invite new person to family (create user + add to family)
  fastify.post('/invite', async (request, reply) => {
    const body = z.object({
      email: z.string().email(),
      name: z.string().min(1).max(200),
      password: z.string().min(1),
      familyRole: z.enum(['adult', 'child']).optional().default('adult'),
    }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed', details: body.error.issues });

    // Only adults can invite
    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, request.currentFamilyId), eq(familyMembers.userId, request.currentUser.id)))
      .limit(1);
    if (membership?.familyRole === 'child') return reply.status(403).send({ error: 'Forbidden' });

    const { email, name, password, familyRole } = body.data;

    // Check if user already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) return reply.status(409).send({ error: 'Email already exists' });

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      name,
      passwordHash: hashPassword(password),
      role: 'user',
      approved: true,
    }).returning();

    // Add to family
    await db.insert(familyMembers).values({
      familyId: request.currentFamilyId,
      userId: newUser!.id,
      role: 'member',
      familyRole,
    });

    // If child, auto-create student record
    if (familyRole === 'child') {
      await db.insert(students).values({
        familyId: request.currentFamilyId,
        userId: newUser!.id,
        name,
      });
    }

    return reply.status(201).send({
      id: newUser!.id,
      email: newUser!.email,
      name: newUser!.name,
      familyRole,
    });
  });
};

export default familyRoutes;
