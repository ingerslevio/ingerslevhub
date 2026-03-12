import { google } from 'googleapis';

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

function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

export async function listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
  const calendar = getCalendarClient(accessToken);
  const { data } = await calendar.calendarList.list();
  return (data.items ?? []).map((item) => ({
    id: item.id ?? '',
    summary: item.summary ?? '',
    primary: item.primary ?? false,
  }));
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient(accessToken);
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
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: CreateEventInput,
): Promise<CalendarEvent> {
  const calendar = getCalendarClient(accessToken);
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
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: UpdateEventInput,
): Promise<CalendarEvent> {
  const calendar = getCalendarClient(accessToken);
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
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const calendar = getCalendarClient(accessToken);
  await calendar.events.delete({ calendarId, eventId });
}
