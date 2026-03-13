import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import * as calendarService from '../services/google-calendar.js';

const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  start: z.string().min(1),
  end: z.string().min(1),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

const selectCalendarSchema = z.object({
  calendarIds: z.array(z.string().min(1)).min(1),
});

const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get<{ Querystring: { start: string; end: string } }>(
    '/events',
    async (request, reply) => {
      const user = request.currentUser;
      const { start, end } = request.query;
      if (!start || !end) {
        return reply.status(400).send({ error: 'start and end query params required' });
      }
      if (!user.accessToken) {
        return reply.status(403).send({ error: 'No Google access token. Please re-authenticate with Google.', code: 'google_auth_required' });
      }

      const tokenCtx = user.refreshToken
        ? { userId: user.id, refreshToken: user.refreshToken }
        : undefined;

      let calendarIds: string[] = [];
      try {
        const parsed = JSON.parse(user.selectedCalendarIds ?? '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          calendarIds = parsed as string[];
        }
      } catch { /* fallback below */ }

      if (calendarIds.length === 0 && user.selectedCalendarId) {
        calendarIds = [user.selectedCalendarId];
      }

      if (calendarIds.length === 0) {
        return reply.status(400).send({ error: 'No calendar selected. Use PUT /calendars/select first.' });
      }

      const results = await Promise.all(
        calendarIds.map((calId) =>
          calendarService.listEvents(user.accessToken!, calId, start, end, tokenCtx),
        ),
      );

      const merged = results.flat().sort((a, b) => a.start.localeCompare(b.start));
      return merged;
    },
  );

  fastify.post('/events', async (request, reply) => {
    const user = request.currentUser;
    const parsed = createEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    if (!user.accessToken) {
      return reply.status(403).send({ error: 'No Google access token.', code: 'google_auth_required' });
    }
    if (!user.selectedCalendarId) {
      return reply.status(400).send({ error: 'No calendar selected.' });
    }
    const tokenCtx = user.refreshToken
      ? { userId: user.id, refreshToken: user.refreshToken }
      : undefined;
    const event = await calendarService.createEvent(
      user.accessToken,
      user.selectedCalendarId,
      parsed.data,
      tokenCtx,
    );
    return reply.status(201).send(event);
  });

  fastify.put<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    const user = request.currentUser;
    const parsed = updateEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    if (!user.accessToken) {
      return reply.status(403).send({ error: 'No Google access token.', code: 'google_auth_required' });
    }
    if (!user.selectedCalendarId) {
      return reply.status(400).send({ error: 'No calendar selected.' });
    }
    const tokenCtx = user.refreshToken
      ? { userId: user.id, refreshToken: user.refreshToken }
      : undefined;
    const event = await calendarService.updateEvent(
      user.accessToken,
      user.selectedCalendarId,
      request.params.id,
      parsed.data,
      tokenCtx,
    );
    return event;
  });

  fastify.delete<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    const user = request.currentUser;
    if (!user.accessToken) {
      return reply.status(403).send({ error: 'No Google access token.', code: 'google_auth_required' });
    }
    if (!user.selectedCalendarId) {
      return reply.status(400).send({ error: 'No calendar selected.' });
    }
    const tokenCtx = user.refreshToken
      ? { userId: user.id, refreshToken: user.refreshToken }
      : undefined;
    await calendarService.deleteEvent(
      user.accessToken,
      user.selectedCalendarId,
      request.params.id,
      tokenCtx,
    );
    return reply.status(204).send();
  });

  fastify.get('/calendars', async (request, reply) => {
    const user = request.currentUser;
    if (!user.accessToken) {
      return reply.status(403).send({ error: 'No Google access token.', code: 'google_auth_required' });
    }
    const tokenCtx = user.refreshToken
      ? { userId: user.id, refreshToken: user.refreshToken }
      : undefined;
    return calendarService.listCalendars(user.accessToken, tokenCtx);
  });

  fastify.put('/calendars/select', async (request, reply) => {
    const userId = request.currentUser.id;
    const parsed = selectCalendarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    const { calendarIds } = parsed.data;
    const primaryCalendarId = calendarIds[0] ?? null;
    await db
      .update(users)
      .set({
        selectedCalendarId: primaryCalendarId,
        selectedCalendarIds: JSON.stringify(calendarIds),
      })
      .where(eq(users.id, userId));
    return { ok: true, selectedCalendarId: primaryCalendarId, selectedCalendarIds: calendarIds };
  });
};

export default calendarRoutes;
