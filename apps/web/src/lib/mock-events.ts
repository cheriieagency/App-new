/** Mutable demo event store when DATABASE_URL is missing. */

import { MOCK_EVENTS } from '@/lib/mock-demo-content';

export type EventLocationType = 'online' | 'in_person';
export type EventAudience = 'invite_only' | 'selected' | 'community';

export type DemoEvent = {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  stream_url: string | null;
  image_url: string | null;
  cover_color: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  speaker_image: string | null;
  category: string | null;
  location_type: EventLocationType;
  location_address: string | null;
  audience: EventAudience;
  invited_member_ids: string[];
  attendee_count: number;
  top_attendees: { name: string; image: string | null }[];
};

let nextId = 800;
let created: DemoEvent[] = [];

function withDefaults(raw: Record<string, unknown>): DemoEvent {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    description: (raw.description as string | null) ?? null,
    start_time: String(raw.start_time ?? ''),
    end_time: (raw.end_time as string | null) ?? null,
    stream_url: (raw.stream_url as string | null) ?? null,
    image_url: (raw.image_url as string | null) ?? null,
    cover_color: (raw.cover_color as string | null) ?? null,
    speaker_name: (raw.speaker_name as string | null) ?? null,
    speaker_bio: (raw.speaker_bio as string | null) ?? null,
    speaker_image: (raw.speaker_image as string | null) ?? null,
    category: (raw.category as string | null) ?? 'Webinar',
    location_type: (raw.location_type as EventLocationType) || 'online',
    location_address: (raw.location_address as string | null) ?? null,
    audience: (raw.audience as EventAudience) || 'community',
    invited_member_ids: Array.isArray(raw.invited_member_ids)
      ? (raw.invited_member_ids as string[])
      : [],
    attendee_count: Number(raw.attendee_count ?? 0),
    top_attendees: Array.isArray(raw.top_attendees)
      ? (raw.top_attendees as { name: string; image: string | null }[])
      : [],
  };
}

export function getMockEvents(): DemoEvent[] {
  const base = (MOCK_EVENTS as Record<string, unknown>[]).map(withDefaults);
  return [...created, ...base].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
}

export function createMockEvent(input: {
  title: string;
  description?: string | null;
  start_time: string;
  stream_url?: string | null;
  image_url?: string | null;
  speaker_name?: string | null;
  speaker_bio?: string | null;
  category?: string | null;
  location_type?: EventLocationType;
  location_address?: string | null;
  audience?: EventAudience;
  invited_member_ids?: string[];
}): DemoEvent {
  const event: DemoEvent = {
    id: nextId++,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    start_time: input.start_time,
    end_time: null,
    stream_url: input.stream_url?.trim() || null,
    image_url: input.image_url?.trim() || null,
    cover_color: '#0f766e',
    speaker_name: input.speaker_name?.trim() || 'Ebba Brobeck',
    speaker_bio: input.speaker_bio?.trim() || null,
    speaker_image: null,
    category: input.category?.trim() || 'Webinar',
    location_type: input.location_type || 'online',
    location_address: input.location_address?.trim() || null,
    audience: input.audience || 'community',
    invited_member_ids: input.invited_member_ids ?? [],
    attendee_count: 0,
    top_attendees: [],
  };
  created = [event, ...created];
  return event;
}
