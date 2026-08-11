'use client';

import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, Trash2 } from 'lucide-react';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

type PlannerNote = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

type PlannerNotesPanelProps = {
  /** Scope notes to the active brand workspace when available. */
  workspaceId?: string | null;
};

function storageKey(workspaceId?: string | null) {
  return `clikd_planner_notes_${workspaceId || 'default'}`;
}

function loadNotes(workspaceId?: string | null): PlannerNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlannerNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(workspaceId: string | null | undefined, notes: PlannerNote[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(notes));
}

function newNote(): PlannerNote {
  return {
    id: `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    body: '',
    updatedAt: new Date().toISOString(),
  };
}

/** Free-form notes pad for the content planner — persisted per workspace. */
export default function PlannerNotesPanel({ workspaceId = null }: PlannerNotesPanelProps) {
  const { locale } = useLanguage();
  const [notes, setNotes] = useState<PlannerNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadNotes(workspaceId);
    setNotes(loaded);
    setActiveId(loaded[0]?.id ?? null);
    setHydrated(true);
  }, [workspaceId]);

  useEffect(() => {
    if (!hydrated) return;
    saveNotes(workspaceId, notes);
  }, [hydrated, notes, workspaceId]);

  const active = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId]
  );

  function createNote() {
    const note = newNote();
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
  }

  function updateActive(patch: Partial<Pick<PlannerNote, 'title' | 'body'>>) {
    if (!activeId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeId
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n
      )
    );
  }

  function deleteActive() {
    if (!activeId) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== activeId);
      setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 min-h-[420px]">
      {/* Note list */}
      <aside className={`${adminCardClass} p-3 flex flex-col gap-2`}>
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            {t('notesTab', locale)}
          </p>
          <button
            type="button"
            onClick={createNote}
            className="inline-flex items-center justify-center h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl text-[#2B2568] hover:bg-[#E9D5FF]/50 transition-colors"
            aria-label={t('notesNew', locale)}
          >
            <Plus size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 max-h-[520px]">
          {notes.length === 0 ? (
            <p className="px-2 py-6 text-xs text-slate-400 text-center leading-relaxed">
              {t('notesEmpty', locale)}
            </p>
          ) : (
            notes.map((note) => {
              const selected = note.id === activeId;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setActiveId(note.id)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 min-h-[44px] transition-colors ${
                    selected
                      ? 'bg-[#E9D5FF]/60 text-slate-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">
                    {note.title.trim() || t('notesUntitled', locale)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {note.body.trim() || t('notesPlaceholder', locale)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Editor */}
      <section className={`${adminCardClass} p-5 sm:p-6 flex flex-col min-h-[420px]`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
            <div className="h-12 w-12 rounded-2xl bg-[#E9D5FF]/60 text-[#2B2568] flex items-center justify-center">
              <NotebookPen size={22} strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-slate-800">{t('notesTitle', locale)}</p>
            <p className="text-sm text-slate-500 max-w-sm">{t('notesHint', locale)}</p>
            <button
              type="button"
              onClick={createNote}
              className="mt-2 inline-flex items-center gap-2 h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-sm font-bold hover:bg-[#1a1848] transition-colors"
            >
              <Plus size={16} strokeWidth={2.25} />
              {t('notesNew', locale)}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-3">
              <input
                type="text"
                value={active.title}
                onChange={(e) => updateActive({ title: e.target.value })}
                placeholder={t('notesTitlePlaceholder', locale)}
                className="flex-1 min-w-0 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 placeholder:text-slate-300 bg-transparent outline-none border-0"
              />
              <button
                type="button"
                onClick={deleteActive}
                className="inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                aria-label={t('notesDelete', locale)}
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
            <textarea
              value={active.body}
              onChange={(e) => updateActive({ body: e.target.value })}
              placeholder={t('notesPlaceholder', locale)}
              className="flex-1 w-full min-h-[280px] resize-none text-sm sm:text-[15px] leading-relaxed text-slate-700 placeholder:text-slate-300 bg-transparent outline-none border-0"
            />
            <p className="mt-3 text-[11px] font-mono text-slate-400">
              {t('notesAutosaved', locale)}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
