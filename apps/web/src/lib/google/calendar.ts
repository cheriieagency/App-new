/**
 * Google Calendar + Meet event creation for 1:1 coaching bookings.
 */

export type CreateMeetEventInput = {
  accessToken: string;
  summary: string;
  description: string;
  startIso: string;
  endIso: string;
  sellerEmail?: string | null;
  buyerEmail?: string | null;
  timeZone?: string;
};

export type CreateMeetEventResult = {
  eventId: string;
  hangoutLink: string | null;
  htmlLink: string | null;
};

export async function createGoogleMeetEvent(
  input: CreateMeetEventInput
): Promise<CreateMeetEventResult> {
  const timeZone = input.timeZone || 'Europe/Stockholm';
  const attendees: Array<{ email: string }> = [];
  if (input.sellerEmail?.includes('@')) {
    attendees.push({ email: input.sellerEmail.trim() });
  }
  if (
    input.buyerEmail?.includes('@') &&
    input.buyerEmail.trim().toLowerCase() !==
      input.sellerEmail?.trim().toLowerCase()
  ) {
    attendees.push({ email: input.buyerEmail.trim() });
  }

  const body = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso, timeZone },
    end: { dateTime: input.endIso, timeZone },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: `clikd-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: {
      entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    };
    error?: { message?: string };
  };

  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Failed to create Calendar event');
  }

  const meetFromEntry =
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')
      ?.uri || null;

  return {
    eventId: data.id,
    hangoutLink: data.hangoutLink || meetFromEntry,
    htmlLink: data.htmlLink || null,
  };
}

/** Default booking window: next weekday at 10:00 local, 60 minutes. */
export function defaultCoachingSlot(durationMinutes = 60): {
  startIso: string;
  endIso: string;
} {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  // Skip weekends
  while (start.getDay() === 0 || start.getDay() === 6) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function looksLikeCoachingProduct(input: {
  productTitle?: string | null;
  productType?: string | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  const title = (input.productTitle || '').toLowerCase();
  const type = (input.productType || '').toLowerCase();
  const metaType = String(input.metadata?.productType || input.metadata?.type || '').toLowerCase();
  if (
    type === 'coaching' ||
    metaType === 'coaching' ||
    type === 'service' ||
    metaType === 'strategy'
  ) {
    return true;
  }
  return (
    title.includes('coaching') ||
    title.includes('1:1') ||
    title.includes('1-1') ||
    title.includes('strategy') ||
    title.includes('call') ||
    title.includes('session')
  );
}
