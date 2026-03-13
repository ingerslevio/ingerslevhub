import { google } from 'googleapis';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { refreshAccessToken } from './google-auth.js';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  calendarId: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start: string;
  end: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start?: string;
  end?: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary: boolean;
}

export interface TokenContext {
  userId: string;
  refreshToken: string;
}

function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

function isAuthError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status === 401 || status === 403;
  }
  // googleapis wraps errors with a code property
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: number }).code;
    return code === 401 || code === 403;
  }
  return false;
}

async function withTokenRefresh<T>(
  tokenCtx: TokenContext | undefined,
  accessToken: string,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  try {
    return await fn(accessToken);
  } catch (err) {
    if (!tokenCtx || !isAuthError(err)) throw err;
    const newToken = await refreshAccessToken(tokenCtx.refreshToken);
    await db
      .update(users)
      .set({ accessToken: newToken })
      .where(eq(users.id, tokenCtx.userId));
    return fn(newToken);
  }
}

export async function listCalendars(
  accessToken: string,
  tokenCtx?: TokenContext,
): Promise<CalendarListEntry[]> {
  return withTokenRefresh(tokenCtx, accessToken, async (token) => {
    const calendar = getCalendarClient(token);
    const { data } = await calendar.calendarList.list();
    return (data.items ?? []).map((item) => ({
      id: item.id ?? '',
      summary: item.summary ?? '',
      primary: item.primary ?? false,
    }));
  });
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  tokenCtx?: TokenContext,
): Promise<CalendarEvent[]> {
  return withTokenRefresh(tokenCtx, accessToken, async (token) => {
    const calendar = getCalendarClient(token);
    const { data } = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return (data.items ?? []).map((event) => ({
      id: event.id ?? '',
      title: event.summary ?? '',
      description: event.description ?? null,
      start: event.start?.dateTime ?? event.start?.date ?? '',
      end: event.end?.dateTime ?? event.end?.date ?? '',
      calendarId,
    }));
  });
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: CreateEventInput,
  tokenCtx?: TokenContext,
): Promise<CalendarEvent> {
  return withTokenRefresh(tokenCtx, accessToken, async (token) => {
    const calendar = getCalendarClient(token);
    const { data } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
      },
    });
    return {
      id: data.id ?? '',
      title: data.summary ?? '',
      description: data.description ?? null,
      start: data.start?.dateTime ?? data.start?.date ?? '',
      end: data.end?.dateTime ?? data.end?.date ?? '',
      calendarId,
    };
  });
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: UpdateEventInput,
  tokenCtx?: TokenContext,
): Promise<CalendarEvent> {
  return withTokenRefresh(tokenCtx, accessToken, async (token) => {
    const calendar = getCalendarClient(token);
    const { data } = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        ...(event.title !== undefined && { summary: event.title }),
        ...(event.description !== undefined && { description: event.description }),
        ...(event.start !== undefined && { start: { dateTime: event.start } }),
        ...(event.end !== undefined && { end: { dateTime: event.end } }),
      },
    });
    return {
      id: data.id ?? '',
      title: data.summary ?? '',
      description: data.description ?? null,
      start: data.start?.dateTime ?? data.start?.date ?? '',
      end: data.end?.dateTime ?? data.end?.date ?? '',
      calendarId,
    };
  });
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  tokenCtx?: TokenContext,
): Promise<void> {
  return withTokenRefresh(tokenCtx, accessToken, async (token) => {
    const calendar = getCalendarClient(token);
    await calendar.events.delete({ calendarId, eventId });
  });
}
