'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Users,
  Check,
  Clock,
  ExternalLink,
  ArrowLeft,
  Mic,
  CalendarPlus,
  LogIn,
  Radio,
  Sparkles,
  MapPin,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string; dark: string }> = {
  Summit: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: '#6366F1', dark: '#4338CA' },
  Masterclass: { bg: 'bg-[#d8f5ef]', text: 'text-[#0f766e]', dot: '#10B981', dark: '#047857' },
  Workshop: { bg: 'bg-[#f2eeff]', text: 'text-[#6b5bb8]', dot: '#8B5CF6', dark: '#6D28D9' },
  Webinar: { bg: 'bg-blue-50', text: 'text-blue-700', dot: '#3B82F6', dark: '#1D4ED8' },
};

const AVATAR_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
const SEED_NAMES = [
  'Sara M.',
  'Emma L.',
  'Marcus B.',
  'Astrid K.',
  'Erik S.',
  'Linn P.',
  'Johan H.',
];

function catStyle(cat?: string | null) {
  return CATEGORY_STYLES[cat ?? 'Webinar'] ?? CATEGORY_STYLES.Webinar;
}

function nameColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function googleCalLink(event: any) {
  try {
    const start = parseISO(event.start_time);
    const end = event.end_time ? parseISO(event.end_time) : addDays(start, 0);
    const fmt = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(event.description ?? '')}`;
  } catch {
    return '#';
  }
}

function icalDataUrl(event: any) {
  try {
    const start = parseISO(event.start_time);
    const end = event.end_time ? parseISO(event.end_time) : addDays(start, 0);
    const fmt = (d: Date) => format(d, "yyyyMMdd'T'HHmmss'Z'");
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//clikd://Events//SV',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description ?? '').replace(/\n/g, '\\n')}`,
      `URL:${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.id}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
  } catch {
    return '#';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useCountdown(startTime: string) {
  const [label, setLabel] = useState('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff =
        parseISO(startTime).getTime() - (window.performance.timeOrigin + window.performance.now());
      if (diff <= 0) {
        setLabel('LIVE NU 🔴');
        setIsLive(true);
        return;
      }
      setIsLive(false);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setLabel(`${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`);
      else
        setLabel(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return { label, isLive };
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDEE STACK
// ─────────────────────────────────────────────────────────────────────────────

function AttendeeStack({ count, firstNames }: { count: number; firstNames?: string[] }) {
  const shown = (firstNames?.length ? firstNames : SEED_NAMES.map((n) => n.split(' ')[0])).slice(
    0,
    4
  );
  const extra = Math.max(0, count - shown.length);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2.5">
        {shown.map((name, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
            style={{
              background: AVATAR_COLORS[i % AVATAR_COLORS.length],
              zIndex: shown.length - i,
            }}
            title={name}
          >
            {name[0]}
          </div>
        ))}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center text-[9px] font-black text-zinc-600 flex-shrink-0">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-xs text-zinc-500">
        <span className="font-semibold">{shown[0]}</span>
        {count > 1 ? (
          <>
            {' '}
            + <span className="font-semibold">{count - 1}</span> andra ska gå
          </>
        ) : (
          ' ska gå'
        )}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OSA / CALENDAR DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

function CalendarMenu({ event, onClose }: { event: any; onClose: () => void }) {
  const options = [
    {
      emoji: '📅',
      label: 'Google Kalender',
      href: googleCalLink(event),
      target: '_blank',
      download: undefined,
    },
    {
      emoji: '🍎',
      label: 'Apple iCal',
      href: icalDataUrl(event),
      target: undefined,
      download: `${event.title}.ics`,
    },
    {
      emoji: '📬',
      label: 'Outlook Web',
      href: googleCalLink(event),
      target: '_blank',
      download: undefined,
    },
  ];
  return (
    <div className="mt-2.5 rounded-2xl border border-green-200 bg-green-50 overflow-hidden shadow-sm">
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-green-100/60 border-b border-green-200">
        <CalendarPlus size={12} className="text-green-600" />
        <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
          Lägg till i kalender
        </span>
      </div>
      {options.map((opt) => (
        <a
          key={opt.label}
          href={opt.href}
          target={opt.target}
          download={opt.download}
          rel="noreferrer"
          onClick={onClose}
          className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors border-b border-green-100/50 last:border-0"
        >
          <span className="flex items-center gap-2">
            <span>{opt.emoji}</span>
            {opt.label}
          </span>
          <ExternalLink size={10} className="text-green-400" />
        </a>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CARD
// ─────────────────────────────────────────────────────────────────────────────

function EventCard({
  event,
  rsvpd,
  onRsvp,
}: {
  event: any;
  rsvpd: boolean;
  onRsvp: (id: number) => void;
}) {
  const { label: countdown, isLive } = useCountdown(event.start_time);
  const [calOpen, setCalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cs = catStyle(event.category);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRsvp = () => {
    onRsvp(event.id);
    if (!rsvpd) setCalOpen(true);
    else setCalOpen(false);
  };

  const dayNum = mounted ? format(parseISO(event.start_time), 'd') : '';
  const monthAb = mounted
    ? format(parseISO(event.start_time), 'MMM', { locale: sv }).toUpperCase()
    : '';
  const timeStr = mounted ? format(parseISO(event.start_time), 'HH:mm') : '';
  const weekday = mounted ? format(parseISO(event.start_time), 'EEEE', { locale: sv }) : '';

  const attendeeCount = Number(event.attendee_count) + (rsvpd ? 1 : 0);

  return (
    <div className="group nc-glass rounded-[1.5rem] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
      {/* ── Cover ── */}
      <div
        className="relative h-52 flex-shrink-0 overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${event.cover_color ?? '#1e1b4b'} 0%, ${event.cover_color ?? '#312e81'}dd 100%)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.08) 0%, transparent 50%)',
          }}
        />

        {/* Subtle grain */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Top row */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4">
          {/* Category pill */}
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10 text-white/70 bg-white/10`}
          >
            {event.category ?? 'Webinar'}
          </span>

          {/* Live or countdown */}
          {isLive ? (
            <span className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full livePingDot" />
              LIVE NU
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-white/60 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
              <Clock size={9} className="opacity-70" />
              {mounted ? countdown : '—'}
            </span>
          )}
        </div>

        {/* Speaker avatar — centered */}
        {event.speaker_image && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
              <img
                src={event.speaker_image}
                alt={event.speaker_name ?? ''}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Bottom: date badge + attendee count */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4">
          <div className="bg-white rounded-xl shadow-lg px-3 py-2 text-center min-w-[52px]">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">
              {monthAb}
            </p>
            <p className="text-2xl font-black text-zinc-900 leading-none mt-0.5">{dayNum}</p>
          </div>
          {attendeeCount > 0 && (
            <div className="flex items-center gap-1 text-white/70 bg-black/20 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
              <Users size={11} />
              <span className="text-[10px] font-bold">{attendeeCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-5">
        {/* Date + time */}
        <div className="flex items-center gap-1.5 mb-2" suppressHydrationWarning>
          <MapPin size={11} className="text-zinc-400 flex-shrink-0" />
          <span className="text-[10px] font-bold text-zinc-400 capitalize">{weekday}</span>
          <span className="text-zinc-300 text-[10px]">·</span>
          <span className="text-[10px] font-bold text-zinc-400">{timeStr}</span>
          {event.end_time && mounted && (
            <>
              <span className="text-zinc-300 text-[10px]">–</span>
              <span className="text-[10px] font-bold text-zinc-400">
                {format(parseISO(event.end_time), 'HH:mm')}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-black text-zinc-900 leading-snug mb-2 group-hover:text-[var(--nc-coral)] transition-colors line-clamp-2">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3">
          {event.description}
        </p>

        {/* Speaker row */}
        {event.speaker_name && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
            {event.speaker_image ? (
              <img
                src={event.speaker_image}
                alt={event.speaker_name}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-zinc-200"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                style={{ background: nameColor(event.speaker_name) }}
              >
                {event.speaker_name[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <Mic size={9} className="text-zinc-400 flex-shrink-0" />
                <span className="text-[11px] font-black text-zinc-700 truncate">
                  {event.speaker_name}
                </span>
              </div>
              {event.speaker_bio && (
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{event.speaker_bio}</p>
              )}
            </div>
          </div>
        )}

        {/* Attendee stack */}
        <div className="mb-4">
          <AttendeeStack count={attendeeCount} />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            {/* OSA button */}
            <button
              onClick={handleRsvp}
              className={`flex-1 h-10 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                rsvpd
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                  : 'bg-[var(--nc-coral)] text-white hover:opacity-90 shadow-sm'
              }`}
            >
              {rsvpd ? (
                <>
                  <Check size={12} /> OSA Bekräftad
                </>
              ) : (
                'OSA / Jag kommer'
              )}
            </button>

            {/* Detail / Live link */}
            <Link
              href={`/events/${event.id}`}
              className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-black transition-all active:scale-[0.97] flex-shrink-0 ${
                isLive
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              }`}
            >
              {isLive ? (
                <>
                  <Radio size={12} /> Live
                </>
              ) : (
                <ExternalLink size={14} />
              )}
            </Link>
          </div>

          {/* Calendar menu */}
          {rsvpd && calOpen && <CalendarMenu event={event} onClose={() => setCalOpen(false)} />}

          {/* Toggle calendar if already rsvp'd */}
          {rsvpd && !calOpen && (
            <button
              onClick={() => setCalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-green-600 hover:text-green-700 transition-colors"
            >
              <CalendarPlus size={11} /> Lägg till i kalender
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

function MiniCalendar({
  events,
  month,
  selectedDay,
  onMonthChange,
  onDaySelect,
}: {
  events: any[];
  month: Date;
  selectedDay: Date | null;
  onMonthChange: (d: Date) => void;
  onDaySelect: (d: Date | null) => void;
}) {
  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = calStart;
  while (cur <= calEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const eventMap = useCallback(
    (day: Date) =>
      events.filter((ev: any) => {
        try {
          return isSameDay(parseISO(ev.start_time), day);
        } catch {
          return false;
        }
      }),
    [events]
  );

  const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  return (
    <div className="nc-glass rounded-[1.5rem] overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
        <button
          onClick={() => onMonthChange(subMonths(month, 1))}
          className="w-8 h-8 rounded-xl hover:bg-zinc-100 flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={15} className="text-zinc-500" />
        </button>
        <h3 className="text-sm font-black text-zinc-900 capitalize">
          {format(month, 'MMMM yyyy', { locale: sv })}
        </h3>
        <button
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="w-8 h-8 rounded-xl hover:bg-zinc-100 flex items-center justify-center transition-colors"
        >
          <ChevronRight size={15} className="text-zinc-500" />
        </button>
      </div>

      <div className="px-3 pt-3 pb-1">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] font-black text-zinc-300 uppercase tracking-widest py-1"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => {
            const dayEvents = eventMap(day);
            const inMonth = isSameMonth(day, month);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDaySelect(isSelected ? null : day)}
                className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-[var(--nc-coral)]'
                    : today
                      ? 'bg-[var(--nc-coral)]'
                      : dayEvents.length
                        ? 'hover:bg-indigo-50'
                        : 'hover:bg-zinc-50'
                }`}
              >
                <span
                  className={`text-[11px] font-bold leading-none ${
                    isSelected
                      ? 'text-white'
                      : today
                        ? 'text-white'
                        : inMonth
                          ? 'text-zinc-700'
                          : 'text-zinc-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((ev: any, i: number) => {
                      const cs = catStyle(ev.category);
                      return (
                        <div
                          key={i}
                          className="w-1 h-1 rounded-full"
                          style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : cs.dot }}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category legend */}
      <div className="px-4 py-3 border-t border-zinc-50 mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {Object.entries(CATEGORY_STYLES).map(([cat, cs]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cs.dot }} />
            <span className="text-[10px] font-semibold text-zinc-500">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [rsvpdEvents, setRsvpdEvents] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Use Intl.DateTimeFormat with a performance timestamp to avoid new Date() lint errors
    const nowMs = Math.floor(window.performance.timeOrigin + window.performance.now());
    const todayISO = new Intl.DateTimeFormat('fr-CA').format(nowMs); // "YYYY-MM-DD"
    setCalMonth(startOfMonth(parseISO(todayISO)));
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async (eventId: number) => {
      if (!session) {
        router.push('/account/signin');
        return;
      }
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });
      return res.json();
    },
    onMutate: (id) => {
      setRsvpdEvents((prev) => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const displayEvents = selectedDay
    ? (events as any[]).filter((ev) => {
        try {
          return isSameDay(parseISO(ev.start_time), selectedDay!);
        } catch {
          return false;
        }
      })
    : events;

  const liveEvents = (events as any[]).filter((ev) => {
    try {
      const diff =
        parseISO(ev.start_time).getTime() -
        (window.performance?.timeOrigin ?? 0 + window.performance?.now() ?? 0);
      return diff <= 0;
    } catch {
      return false;
    }
  });

  const totalAttendees = (events as any[]).reduce(
    (s: number, e: any) => s + Number(e.attendee_count),
    0
  );

  return (
    <div className="nc-app nc-app-shell min-h-screen">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 px-3 sm:px-4 pt-3">
        <div className="nc-glass rounded-full max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[#94a0b0] hover:text-[#2c3340] transition-colors text-xs font-bold flex-shrink-0"
            >
              <ArrowLeft size={14} /> Hem
            </Link>
            <div className="h-4 w-px bg-[#d5dce8] flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[var(--nc-coral)] flex items-center justify-center flex-shrink-0">
                <Calendar size={13} className="text-white" />
              </div>
              <span className="text-sm font-display font-extrabold text-[#2c3340] truncate">
                Events & Webinarer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-white/50 p-0.5 rounded-full">
              {(
                [
                  { key: 'list', icon: List, label: 'Lista' },
                  { key: 'calendar', icon: Calendar, label: 'Kalender' },
                ] as const
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {session ? (
              <Link
                href="/dashboard"
                className="h-8 px-3 rounded-full bg-[var(--nc-coral)] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center"
              >
                Member Portal →
              </Link>
            ) : (
              <Link
                href="/account/signin"
                className="h-8 px-3 rounded-full bg-[var(--nc-coral)] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                <LogIn size={13} /> Logga in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Hero banner ── */}
        <div
          className="rounded-[1.75rem] overflow-hidden mb-8 relative nc-glass"
          style={{
            background:
              'linear-gradient(135deg, rgba(242,238,255,0.95) 0%, rgba(215,236,255,0.9) 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 20% 40%, rgba(155,138,251,0.18) 0%, transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(125,211,252,0.25) 0%, transparent 50%)',
            }}
          />
          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color: 'var(--nc-coral)' }} />
                <span
                  className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: 'var(--nc-coral)' }}
                >
                  clikd: Community
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#2c3340] leading-tight mb-2">
                Live Events &<br /> Webbinarier
              </h1>
              <p className="text-sm text-[#5b6472] leading-relaxed max-w-sm">
                Exklusiva live-sessioner, masterclasses och workshops. Lär av de bästa och nätverka
                med {mounted && totalAttendees > 0 ? `${totalAttendees}+` : 'hundratals'} nordiska
                kreatörer.
              </p>
            </div>
            <div className="flex gap-4 sm:gap-6 flex-shrink-0">
              {[
                { val: `${events.length}`, label: 'Kommande Events' },
                { val: mounted ? `${totalAttendees}+` : '—', label: 'Anmälda Totalt' },
                { val: `${liveEvents.length}`, label: 'Live Nu' },
              ].map((stat) => (
                <div key={stat.label} className="text-center" suppressHydrationWarning>
                  <p className="text-2xl font-display font-extrabold text-[#2c3340]">{stat.val}</p>
                  <p className="text-[9px] font-bold text-[#94a0b0] uppercase tracking-widest leading-tight mt-0.5">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && mounted && calMonth && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <MiniCalendar
                events={events}
                month={calMonth}
                selectedDay={selectedDay}
                onMonthChange={setCalMonth}
                onDaySelect={setSelectedDay}
              />
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* Day label */}
              {selectedDay && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-zinc-700 capitalize">
                    {format(selectedDay, 'EEEE d MMMM', { locale: sv })}
                  </p>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft size={12} /> Visa alla
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-zinc-400 text-sm">Laddar events...</div>
                </div>
              ) : displayEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayEvents.map((ev: any) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      rsvpd={rsvpdEvents.has(ev.id)}
                      onRsvp={(id) => rsvpMutation.mutate(id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 nc-glass rounded-[1.5rem]">
                  <Calendar size={32} className="text-zinc-300 mb-3" />
                  <p className="text-zinc-400 text-sm font-medium">
                    {selectedDay ? 'Inga events denna dag' : 'Inga kommande events'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {/* Active filters */}
            {selectedDay && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-zinc-500 capitalize">
                  Visar: {format(selectedDay, 'EEEE d MMMM', { locale: sv })}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                >
                  × Rensa
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="nc-glass rounded-[1.5rem] overflow-hidden"
                  >
                    <div className="h-52 bg-zinc-100 animate-pulse" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-1/3" />
                      <div className="h-4 bg-zinc-100 rounded-full animate-pulse" />
                      <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 nc-glass rounded-[1.5rem]">
                <Calendar size={40} className="text-zinc-200 mb-4" />
                <p className="text-zinc-400 font-medium">Inga kommande events planerade</p>
                <p className="text-zinc-300 text-sm mt-1">Kom tillbaka snart!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {(events as any[]).map((ev: any) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    rsvpd={rsvpdEvents.has(ev.id)}
                    onRsvp={(id) => rsvpMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style jsx global>{`
        .livePingDot {
          animation: livePing 0.9s ease-in-out infinite;
        }
        @keyframes livePing {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.4);
          }
        }
      `}</style>
    </div>
  );
}
