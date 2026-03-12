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
  calendarId: z.string().min(1),
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
        return reply.status(401).send({ error: 'No access token. Please re-authenticate with Google.' });
      }
      if (!user.selectedCalendarId) {
        return reply.status(400).send({ error: 'No calendar selected. Use PUT /calendars/select first.' });
      }
      return calendarService.listEvents(user.accessToken, user.selectedCalendarId, start, end);
    },
  );

  fastify.post('/events', async (request, reply) => {
    const user = request.currentUser;
    const parsed = createEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    if (!user.accessToken) {
      return reply.status(401).send({ error: 'No access token.' });
    }
    if (!user.selectedCalendarId) {
      return reply.status(400).send({ error: 'No calendar selected.' });
    }
    const event = await calendarService.createEvent(
      user.accessToken,
      user.selectedCalendarId,
      parsed.data,
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
      return reply.status(401).send({ error: 'No access token.' });
    }
    if (!user.selectedCalendarId) {
      return reply.status(400).send({ error: 'No calendar selected.' });
    }
    const event = await calendarService.updateEvent(
      user.accessToken,
      user.selectedCalendarId,
      request.params.id,
      parsed.data,
    );
    return event;
  });

  fastify.delete<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    const user = request.currentUser;
    if (!user.accessToken) {
      return reply.status(401).send({ error: 'No access token.' });
    }
    if (!user.selectedCalendarId) {
      return reply.status(400).send({ error: 'No calendar selected.' });
    }
    await calendarService.deleteEvent(
      user.accessToken,
      user.selectedCalendarId,
      request.params.id,
    );
    return reply.status(204).send();
  });

  fastify.get('/calendars', async (request, reply) => {
    const user = request.currentUser;
    if (!user.accessToken) {
      return reply.status(401).send({ error: 'No access token.' });
    }
    return calendarService.listCalendars(user.accessToken);
  });

  fastify.put('/calendars/select', async (request, reply) => {
    const userId = request.currentUser.id;
    const parsed = selectCalendarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }
    await db
      .update(users)
      .set({ selectedCalendarId: parsed.data.calendarId })
      .where(eq(users.id, userId));
    return { ok: true, selectedCalendarId: parsed.data.calendarId };
  });
};

export default calendarRoutes;
