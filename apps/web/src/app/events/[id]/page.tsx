'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';
import { format, parseISO, addDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import {
  ArrowLeft,
  Send,
  Users,
  Radio,
  Check,
  Clock,
  Mic,
  CalendarPlus,
  ExternalLink,
  Play,
  ChevronDown,
  MessageSquare,
  Share2,
  Circle,
  Smile,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

function nameColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
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
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
  } catch {
    return '#';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BIG COUNTDOWN
// ─────────────────────────────────────────────────────────────────────────────

function BigCountdown({ startTime }: { startTime: string }) {
  const { locale } = useLanguage();
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, live: false, ready: false });

  useEffect(() => {
    const tick = () => {
      const diff =
        parseISO(startTime).getTime() - (window.performance.timeOrigin + window.performance.now());
      if (diff <= 0) {
        setParts({ d: 0, h: 0, m: 0, s: 0, live: true, ready: true });
        return;
      }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        live: false,
        ready: true,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  if (!parts.ready) return null;

  if (parts.live) {
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <div className="w-3 h-3 bg-red-500 rounded-full liveBlip" />
        <span className="text-4xl sm:text-5xl font-black text-red-400 tracking-tighter">
          {t('liveNow', locale)}
        </span>
      </div>
    );
  }

  const units =
    parts.d > 0
      ? [
          { v: parts.d, l: t('days', locale) },
          { v: parts.h, l: t('hours', locale) },
          { v: parts.m, l: t('mins', locale) },
          { v: parts.s, l: t('sec', locale) },
        ]
      : [
          { v: parts.h, l: t('hours', locale) },
          { v: parts.m, l: t('mins', locale) },
          { v: parts.s, l: t('sec', locale) },
        ];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
      {units.map((u, i) => (
        <div key={u.l} className="flex items-center gap-2 sm:gap-4">
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 sm:px-7 py-3 sm:py-5 min-w-[64px] sm:min-w-[88px]">
              <span className="text-3xl sm:text-5xl font-black text-white tabular-nums block leading-none tracking-tight">
                {String(u.v).padStart(2, '0')}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest mt-2">
              {u.l}
            </p>
          </div>
          {i < units.length - 1 && (
            <span className="text-3xl sm:text-4xl font-black text-white/20 pb-6">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CHAT
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['🔥', '👏', '💡', '❤️', '🙌', '😮'];

function LiveChat({ eventId, session }: { eventId: number; session: any }) {
  const queryClient = useQueryClient();
  const { locale } = useLanguage();
  const [msg, setMsg] = useState('');
  const [emojiBar, setEmojiBar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/chat`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(['chat', eventId], (old: any[]) => [...(old ?? []), newMsg]);
      setMsg('');
    },
  });

  const handleSend = () => {
    const text = msg.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  const sendEmoji = (emoji: string) => {
    sendMutation.mutate(emoji);
    setEmojiBar(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {(messages as any[]).length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-2">
            <MessageSquare size={28} className="text-zinc-700" />
            <p className="text-zinc-500 text-xs font-medium">{t('chatOpensAtStart', locale)}</p>
          </div>
        )}
        {(messages as any[]).map((m: any, i: number) => {
          const color = nameColor(m.user_name ?? '?');
          const isEmoji = /^\p{Emoji}+$/u.test(m.message) && m.message.length <= 4;
          return (
            <div key={m.id ?? i} className="flex gap-2.5 group">
              {/* Avatar */}
              {m.user_image ? (
                <img
                  src={m.user_image}
                  alt={m.user_name}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white mt-0.5"
                  style={{ background: color }}
                >
                  {(m.user_name ?? '?')[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black mr-1" style={{ color }}>
                  {m.user_name}
                </span>
                {isEmoji ? (
                  <span className="text-2xl">{m.message}</span>
                ) : (
                  <span className="text-xs text-zinc-300 leading-relaxed break-words">
                    {m.message}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Emoji bar */}
      {emojiBar && (
        <div className="flex items-center gap-1 px-3 py-2 border-t border-zinc-800 bg-zinc-900/80">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => sendEmoji(e)}
              className="text-xl hover:scale-125 active:scale-95 transition-transform p-0.5"
              disabled={!session}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="px-3 pb-3 pt-2 border-t border-zinc-800 flex-shrink-0">
        {session ? (
          <div className="flex items-center gap-2">
            {/* Emoji toggle */}
            <button
              onClick={() => setEmojiBar(!emojiBar)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${emojiBar ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            >
              <Smile size={15} />
            </button>
            <input
              ref={inputRef}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('writeMessage', locale)}
              className="flex-1 h-9 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-xs px-3 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!msg.trim() || sendMutation.isPending}
              className="w-9 h-9 rounded-xl bg-[var(--nc-coral)] hover:opacity-90 flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all"
            >
              <Send size={13} className="text-white" />
            </button>
          </div>
        ) : (
          <Link
            href="/account/signin"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 border border-zinc-700 rounded-xl transition-colors hover:border-zinc-600"
          >
            {t('loginToChat', locale)}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDEE ROW
// ─────────────────────────────────────────────────────────────────────────────

function AttendeeRow({ count, avatarColors }: { count: number; avatarColors?: string[] }) {
  const shown = SEED_NAMES.slice(0, Math.min(5, count));
  const extra = Math.max(0, count - shown.length);
  const colors = avatarColors ?? AVATAR_COLORS;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex -space-x-2.5">
        {shown.map((name, i) => (
          <div
            key={name}
            className="w-8 h-8 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
            style={{ background: colors[i % colors.length], zIndex: shown.length - i }}
          >
            {name[0]}
          </div>
        ))}
        {extra > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-300 flex-shrink-0">
            +{extra}
          </div>
        )}
      </div>
      {count > 0 && (
        <p className="text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">{shown[0]?.split(' ')[0]}</span>
          {count > 1 && (
            <>
              {' '}
              + <span className="font-semibold text-zinc-300">{count - 1}</span> andra ska gå
            </>
          )}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = Number(id);

  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const { locale } = useLanguage();

  const [rsvpd, setRsvpd] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  // Live status polling
  useEffect(() => {
    if (!event?.start_time) return;
    const check = () => {
      const diff =
        parseISO(event.start_time).getTime() -
        (window.performance.timeOrigin + window.performance.now());
      setIsLive(diff <= 0);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [event?.start_time]);

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });
      return res.json();
    },
    onMutate: () => {
      setRsvpd((p) => !p);
    },
    onSuccess: (data) => {
      if (data.rsvpd) setCalOpen(true);
      else setCalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: event?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const dateStr =
    mounted && event?.start_time
      ? format(parseISO(event.start_time), "EEEE d MMMM 'kl.' HH:mm", { locale: sv })
      : '';
  const dayStr =
    mounted && event?.start_time ? format(parseISO(event.start_time), 'd MMM', { locale: sv }) : '';

  const attendeeCount = Number(event?.attendee_count ?? 0) + (rsvpd ? 1 : 0);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3 ">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-zinc-400 text-sm">{t('loadingEvents', locale)}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 ">
        <p className="text-white text-lg font-black">{t('eventNotFound', locale)}</p>
        <Link
          href="/events"
          className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors"
        >
          {t('backToEvents', locale)}
        </Link>
      </div>
    );
  }

  const calendarOptions = [
    {
      emoji: '📅',
      label: t('googleCal', locale),
      href: googleCalLink(event),
      target: '_blank',
      download: undefined,
    },
    {
      emoji: '🍎',
      label: t('appleCal', locale),
      href: icalDataUrl(event),
      target: undefined,
      download: `${event.title}.ics`,
    },
    {
      emoji: '📬',
      label: t('outlookCal', locale),
      href: googleCalLink(event),
      target: '_blank',
      download: undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white  flex flex-col">
      {/* ── Top bar ── */}
      <header className="bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 flex-shrink-0 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/events"
              className="p-2 rounded-xl hover:bg-zinc-800 transition-colors flex-shrink-0 text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{event.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {isLive ? (
                  <>
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full liveBlip" />
                    <span className="text-[10px] text-red-400 font-bold">LIVE</span>
                  </>
                ) : (
                  <>
                    <Clock size={10} className="text-zinc-500" />
                    <span className="text-[10px] text-zinc-500" suppressHydrationWarning>
                      {dateStr}
                    </span>
                  </>
                )}
                <span className="text-zinc-700">·</span>
                <Users size={10} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-500">{attendeeCount} anmälda</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-700"
            >
              <Share2 size={12} />
              <span className="hidden sm:inline">{copied ? t('copied', locale) : t('shareEvent', locale)}</span>
            </button>
            {/* Chat toggle (mobile) */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="sm:hidden flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white h-8 px-2.5 rounded-xl hover:bg-zinc-800 transition-all border border-zinc-700"
            >
              💬 {chatOpen ? '↑' : '↓'}
            </button>
            {/* RSVP */}
            <button
              onClick={() => rsvpMutation.mutate()}
              className={`flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-black transition-all active:scale-95 ${
                rsvpd
                  ? 'bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30'
                  : 'bg-[var(--nc-coral)] hover:opacity-90 text-white shadow-md shadow-[rgba(155,138,251,0.35)]'
              }`}
            >
              {rsvpd ? (
                <>
                  <Check size={12} /> {t('rsvpConfirmed', locale)}
                </>
              ) : (
                t('rsvp', locale)
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* ── Left: Video + Info ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Video / Countdown hero */}
          {isLive ? (
            <div className="relative bg-black flex-shrink-0">
              <div className="aspect-video w-full">
                {event.stream_url ? (
                  <iframe
                    src={event.stream_url.replace('watch?v=', 'embed/') + '?autoplay=1&rel=0'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 gap-5">
                    <div className="w-24 h-24 rounded-3xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <Play size={40} className="text-zinc-600" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-black text-lg">{t('streamStartsSoon', locale)}</p>
                      <p className="text-zinc-500 text-sm mt-1">
                        Video-länk ej konfigurerad av admin
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {/* Overlays */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-red-500/40">
                <div className="w-1.5 h-1.5 bg-white rounded-full liveBlip" /> LIVE
              </div>
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/70 backdrop-blur text-white/80 text-[10px] font-bold px-2.5 py-1.5 rounded-full border border-white/10">
                <Users size={10} /> {attendeeCount} tittar
              </div>
            </div>
          ) : (
            /* Pre-event countdown */
            <div
              className="relative flex-shrink-0 py-14 sm:py-20 px-6 text-center overflow-hidden"
              style={{
                background: `linear-gradient(160deg, ${event.cover_color ?? '#1e1b4b'} 0%, #050508 100%)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(ellipse at 25% 50%, rgba(99,102,241,0.2) 0%, transparent 55%), radial-gradient(ellipse at 75% 20%, rgba(139,92,246,0.15) 0%, transparent 50%)',
                }}
              />

              {/* Speaker avatar */}
              {event.speaker_image && (
                <div className="relative flex justify-center mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                    <img
                      src={event.speaker_image}
                      alt={event.speaker_name ?? ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="relative">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-6">
                  {t('startsIn', locale)}
                </p>
                <BigCountdown startTime={event.start_time} />
                <p className="text-sm text-white/40 mt-6 capitalize" suppressHydrationWarning>
                  {dateStr}
                </p>
              </div>
            </div>
          )}

          {/* ── Event info panel ── */}
          <div className="p-5 sm:p-6 sm:pb-10 space-y-6 bg-zinc-950">
            {/* Title + tags */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  {event.category ?? 'Webinar'}
                </span>
                {isLive && (
                  <span className="text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Circle size={6} fill="currentColor" /> LIVE
                  </span>
                )}
                <span
                  className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1"
                  suppressHydrationWarning
                >
                  <Clock size={10} /> {dayStr}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{event.description}</p>
              )}
            </div>

            {/* Speaker card */}
            {event.speaker_name && (
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Mic size={10} /> Talare
                </p>
                <div className="flex items-center gap-3">
                  {event.speaker_image ? (
                    <img
                      src={event.speaker_image}
                      alt={event.speaker_name}
                      className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 border border-zinc-700"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                      style={{ background: nameColor(event.speaker_name) }}
                    >
                      {event.speaker_name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-black text-white">{event.speaker_name}</p>
                    {event.speaker_bio && (
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                        {event.speaker_bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Attendees */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Users size={10} /> {attendeeCount} Anmälda Deltagare
              </p>
              <AttendeeRow count={attendeeCount} />
            </div>

            {/* RSVP section */}
            <div className="space-y-3">
              <button
                onClick={() => rsvpMutation.mutate()}
                className={`w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  rsvpd
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/25'
                    : 'bg-[var(--nc-coral)] hover:opacity-90 text-white shadow-lg shadow-[rgba(155,138,251,0.35)]'
                }`}
              >
                {rsvpd ? (
                  <>
                    <Check size={15} /> {t('rsvpConfirmed', locale)}
                  </>
                ) : (
                  t('rsvp', locale)
                )}
              </button>

              {/* Add to calendar accordion */}
              {rsvpd && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setCalOpen(!calOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-black text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarPlus size={13} className="text-green-400" />
                      {t('addToCalendar', locale)}
                    </div>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${calOpen ? 'rotate-180' : ''} text-zinc-500`}
                    />
                  </button>
                  {calOpen && (
                    <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                      {calendarOptions.map((opt) => (
                        <a
                          key={opt.label}
                          href={opt.href}
                          target={opt.target}
                          download={opt.download}
                          rel="noreferrer"
                          className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
                        >
                          <span className="text-base">{opt.emoji}</span>
                          <span className="flex-1">{opt.label}</span>
                          <ExternalLink size={10} className="text-zinc-600" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Chat panel ── */}
        <aside
          className={`${chatOpen ? 'flex' : 'hidden'} sm:flex flex-col w-full lg:w-[340px] xl:w-[380px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-800`}
          style={{ height: 'calc(100vh - 57px)', position: 'sticky', top: 57 }}
        >
          {/* Chat header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-red-500 liveBlip' : 'bg-zinc-600'}`}
            />
            <Radio size={13} className={isLive ? 'text-red-400' : 'text-zinc-500'} />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-200">
              {isLive ? t('liveChat', locale) : t('eventChat', locale)}
            </span>
            <span className="ml-auto text-[10px] text-zinc-600 font-medium">
              {isLive ? t('updatesEvery3s', locale) : t('chatOpensAtStart', locale)}
            </span>
          </div>

          {/* Chat body */}
          <div className="flex-1 min-h-0">
            <LiveChat eventId={eventId} session={session} />
          </div>
        </aside>
      </div>

      <style jsx global>{`
        .liveBlip {
          animation: liveBlip 0.9s ease-in-out infinite;
        }
        @keyframes liveBlip {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}
