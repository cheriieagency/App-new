'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, StickyNote, Trash2, X } from 'lucide-react';
import { PlatformIcon } from '@/components/planner/PlatformBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PlannerPost } from '@/lib/mock-content-planner';

const NOTES_KEY = 'nc_planner_sticky_notes';

type NoteColor = 'yellow' | 'pink' | 'sky' | 'lime';

type StickyNoteItem = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  text: string;
  color: NoteColor;
};

const NOTE_COLORS: { key: NoteColor; swatch: string; card: string }[] = [
  { key: 'yellow', swatch: 'bg-amber-300', card: 'bg-amber-100 border-amber-200 text-amber-950' },
  { key: 'pink', swatch: 'bg-pink-300', card: 'bg-pink-100 border-pink-200 text-pink-950' },
  { key: 'sky', swatch: 'bg-sky-300', card: 'bg-sky-100 border-sky-200 text-sky-950' },
  { key: 'lime', swatch: 'bg-lime-300', card: 'bg-lime-100 border-lime-200 text-lime-950' },
];

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function postDate(post: PlannerPost): Date | null {
  const iso = post.scheduled_at || post.published_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function statusDot(post: PlannerPost) {
  if (post.workflow === 'PUBLISHED' || post.status === 'published') return 'bg-emerald-500';
  if (post.workflow === 'SCHEDULED' || post.status === 'scheduled') return 'bg-sky-500';
  if (post.workflow === 'READY') return 'bg-violet-500';
  if (post.workflow === 'IN_PROGRESS') return 'bg-indigo-500';
  return 'bg-amber-400';
}

function loadNotes(): StickyNoteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StickyNoteItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistNotes(notes: StickyNoteItem[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function colorClass(color: NoteColor) {
  return NOTE_COLORS.find((c) => c.key === color)?.card ?? NOTE_COLORS[0].card;
}

export default function ContentCalendar({
  posts,
  view,
  cursor,
  onCursorChange,
  onSelectPost,
  onSelectDay,
}: {
  posts: PlannerPost[];
  view: 'month' | 'week';
  cursor: Date;
  onCursorChange: (d: Date) => void;
  onSelectPost: (post: PlannerPost) => void;
  onSelectDay: (d: Date) => void;
}) {
  const [notes, setNotes] = useState<StickyNoteItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDate, setEditorDate] = useState<Date | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [editorColor, setEditorColor] = useState<NoteColor>('yellow');

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    const monthStart = startOfMonth(cursor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor, view]);

  const label = useMemo(() => {
    return new Intl.DateTimeFormat('sv-SE', {
      month: 'long',
      year: 'numeric',
      ...(view === 'week' ? { day: 'numeric' } : {}),
    }).format(cursor);
  }, [cursor, view]);

  const shift = (dir: number) => {
    const next = new Date(cursor);
    if (view === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    onCursorChange(next);
  };

  const today = new Date();

  const notesByDay = useMemo(() => {
    const map = new Map<string, StickyNoteItem[]>();
    for (const note of notes) {
      const list = map.get(note.dateKey) ?? [];
      list.push(note);
      map.set(note.dateKey, list);
    }
    return map;
  }, [notes]);

  const openNewNote = (day: Date) => {
    setEditorDate(day);
    setEditorId(null);
    setEditorText('');
    setEditorColor('yellow');
    setEditorOpen(true);
  };

  const openEditNote = (note: StickyNoteItem) => {
    const [y, m, d] = note.dateKey.split('-').map(Number);
    setEditorDate(new Date(y, m - 1, d));
    setEditorId(note.id);
    setEditorText(note.text);
    setEditorColor(note.color);
    setEditorOpen(true);
  };

  const saveNote = () => {
    if (!editorDate || !editorText.trim()) return;
    const key = dateKey(editorDate);
    setNotes((prev) => {
      let next: StickyNoteItem[];
      if (editorId) {
        next = prev.map((n) =>
          n.id === editorId
            ? { ...n, text: editorText.trim(), color: editorColor, dateKey: key }
            : n
        );
      } else {
        next = [
          {
            id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            dateKey: key,
            text: editorText.trim(),
            color: editorColor,
          },
          ...prev,
        ];
      }
      persistNotes(next);
      return next;
    });
    setEditorOpen(false);
  };

  const deleteNote = () => {
    if (!editorId) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== editorId);
      persistNotes(next);
      return next;
    });
    setEditorOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-600"
          aria-label="Föregående"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center min-w-0">
          <p className="text-sm font-extrabold text-slate-900 capitalize truncate">{label}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onCursorChange(new Date())}
              className="text-[11px] font-extrabold text-[var(--nc-coral)] h-8"
            >
              Idag
            </button>
            <span className="text-zinc-200">·</span>
            <button
              type="button"
              onClick={() => openNewNote(cursor)}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 h-8"
            >
              <StickyNote size={12} /> Post-it
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-600"
          aria-label="Nästa"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-black uppercase tracking-wider text-zinc-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${view === 'week' ? 'min-h-[220px]' : ''}`}>
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const key = dateKey(day);
          const dayNotes = notesByDay.get(key) ?? [];
          const dayPosts = posts.filter((p) => {
            const pd = postDate(p);
            return pd ? sameDay(pd, day) : false;
          });
          const noteLimit = view === 'week' ? 3 : 1;
          const postLimit = view === 'week' ? 3 : 2;

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDay(day);
                }
              }}
              className={`min-h-[88px] sm:min-h-[110px] rounded-xl border p-1.5 text-left transition-colors flex flex-col gap-1 cursor-pointer ${
                view === 'month' && !inMonth
                  ? 'border-transparent bg-transparent opacity-35'
                  : isToday
                    ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_6%,white)]'
                    : 'border-zinc-100 bg-white hover:bg-zinc-50 hover:border-zinc-200'
              }`}
              title="Skapa / schemalägg inlägg"
            >
              <div className="flex items-center justify-between gap-0.5">
                <span
                  className={`text-[11px] font-extrabold w-6 h-6 rounded-full inline-flex items-center justify-center min-h-[24px] ${
                    isToday ? 'bg-[var(--nc-coral)] text-white' : 'text-zinc-500'
                  }`}
                >
                  {day.getDate()}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openNewNote(day);
                  }}
                  className="w-7 h-7 min-h-[28px] rounded-lg text-amber-600/80 hover:bg-amber-50 hover:text-amber-700 inline-flex items-center justify-center"
                  title="Lägg till post-it"
                  aria-label={`Lägg till post-it ${day.getDate()}`}
                >
                  <StickyNote size={12} />
                </button>
              </div>

              <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
                {dayNotes.slice(0, noteLimit).map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditNote(note);
                    }}
                    className={`w-full rounded-md border px-1.5 py-1 text-left shadow-sm rotate-[-0.5deg] hover:rotate-0 transition-transform ${colorClass(note.color)}`}
                    title={note.text}
                  >
                    <p className="text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-2">
                      {note.text}
                    </p>
                  </button>
                ))}
                {dayNotes.length > noteLimit && (
                  <p className="text-[9px] font-bold text-amber-700/80 px-0.5">
                    +{dayNotes.length - noteLimit} lapp
                    {dayNotes.length - noteLimit > 1 ? 'ar' : ''}
                  </p>
                )}

                {dayPosts.slice(0, postLimit).map((post) => (
                  <div
                    key={post.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPost(post);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        onSelectPost(post);
                      }
                    }}
                    className="w-full rounded-lg bg-zinc-50 border border-zinc-100 px-1.5 py-1 hover:border-zinc-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot(post)}`} />
                      <div className="flex -space-x-1">
                        {post.platforms.slice(0, 3).map((p) => (
                          <span key={p} className="scale-75 origin-left">
                            <PlatformIcon platform={p} size={10} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-[#2c3340] truncate leading-tight">
                      {post.title || post.idea_title || post.caption.split('\n')[0]}
                    </p>
                  </div>
                ))}
                {dayPosts.length > postLimit && (
                  <p className="text-[10px] font-bold text-zinc-400 px-1">
                    +{dayPosts.length - postLimit} mer
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky note editor */}
      {editorOpen && editorDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-[#2c3340]/35 backdrop-blur-sm"
            aria-label="Stäng"
            onClick={() => setEditorOpen(false)}
          />
          <div
            className={`relative w-full max-w-md rounded-2xl border shadow-xl p-5 ${colorClass(editorColor)}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  Post-it ·{' '}
                  {editorDate.toLocaleDateString('sv-SE', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                <p className="text-sm font-black mt-0.5">
                  {editorId ? 'Redigera påminnelse' : 'Ny påminnelse'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl hover:bg-black/5 inline-flex items-center justify-center"
                aria-label="Stäng"
              >
                <X size={16} />
              </button>
            </div>

            <Textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder="T.ex. Filma B-roll, påminn teamet, deadline för caption…"
              className="min-h-[120px] rounded-xl border-black/10 bg-white/70 resize-none text-sm font-medium"
              autoFocus
            />

            <div className="flex items-center gap-2 mt-3">
              <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mr-1">
                Färg
              </p>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setEditorColor(c.key)}
                  className={`w-8 h-8 min-h-[32px] rounded-full ${c.swatch} ${
                    editorColor === c.key ? 'ring-2 ring-offset-2 ring-[#2c3340]/40' : ''
                  }`}
                  aria-label={c.key}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4">
              {editorId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={deleteNote}
                  className="h-11 min-h-[44px] rounded-xl text-rose-700 hover:bg-rose-50 gap-1.5"
                >
                  <Trash2 size={14} /> Ta bort
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditorOpen(false)}
                className="h-11 min-h-[44px] rounded-xl"
              >
                Avbryt
              </Button>
              <Button
                type="button"
                onClick={saveNote}
                disabled={!editorText.trim()}
                className="h-11 min-h-[44px] rounded-xl bg-[#2c3340] hover:bg-[#1f2430] text-white font-extrabold"
              >
                Spara lapp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
