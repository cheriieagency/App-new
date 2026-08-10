'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Settings2,
  Sparkles,
  FileText,
  Clock,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ContentCalendar from '@/components/planner/ContentCalendar';
import AiContentGenerator from '@/components/planner/AiContentGenerator';
import PostComposer from '@/components/planner/PostComposer';
import { PlatformBadge } from '@/components/planner/PlatformBadge';
import type {
  AiContentIdea,
  PlannerPost,
  SocialPlatform,
} from '@/lib/mock-content-planner';
import { useLanguage } from '@/lib/locale-context';
import { t, localeTag } from '@/lib/i18n';

export default function PlannerDashboard() {
  const { locale } = useLanguage();
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [view, setView] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [aiOpen, setAiOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<PlannerPost | null>(null);
  const [seedIdea, setSeedIdea] = useState<AiContentIdea | null>(null);
  const [seedPlatform, setSeedPlatform] = useState<SocialPlatform | null>(null);
  const [defaultScheduledAt, setDefaultScheduledAt] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ posts: PlannerPost[] }>({
    queryKey: ['planner-posts'],
    queryFn: async () => {
      const r = await fetch('/api/planner');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!session,
  });

  const posts = data?.posts ?? [];

  const stats = useMemo(() => {
    const scheduled = posts.filter((p) => p.status === 'scheduled').length;
    const drafts = posts.filter((p) => p.status === 'draft').length;
    const published = posts.filter((p) => p.status === 'published').length;
    return { scheduled, drafts, published };
  }, [posts]);

  const upcoming = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'scheduled' && p.scheduled_at)
        .sort(
          (a, b) =>
            new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()
        )
        .slice(0, 6),
    [posts]
  );

  const openComposer = (post?: PlannerPost | null) => {
    setEditing(post ?? null);
    setSeedIdea(null);
    setSeedPlatform(null);
    setDefaultScheduledAt(null);
    setComposerOpen(true);
  };

  const openFromIdea = (idea: AiContentIdea, platform: SocialPlatform) => {
    setEditing(null);
    setSeedIdea(idea);
    setSeedPlatform(platform);
    setAiOpen(false);
    setComposerOpen(true);
  };

  const openForDay = (day: Date) => {
    setEditing(null);
    setSeedIdea(null);
    setSeedPlatform(null);
    const d = new Date(day);
    d.setHours(10, 0, 0, 0);
    setDefaultScheduledAt(d.toISOString());
    setComposerOpen(true);
  };

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: Date }) => {
      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          id,
          scheduled_at: scheduledAt.toISOString(),
          actor: 'Ebba',
        }),
      });
      if (!r.ok) throw new Error('reschedule failed');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
    },
  });

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">
        {t('loading', locale)}
      </div>
    );
  }
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  const statCards = [
    { labelKey: 'statScheduled' as const, value: stats.scheduled, icon: Clock },
    { labelKey: 'statDrafts' as const, value: stats.drafts, icon: FileText },
    { labelKey: 'statPublished' as const, value: stats.published, icon: CalendarDays },
  ];

  return (
    <div className="nc-app nc-app-shell min-h-screen">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-2 rounded-xl text-sm font-extrabold text-zinc-500 hover:text-[#2c3340] hover:bg-zinc-50"
          >
            <ArrowLeft size={15} /> {t('adminShort', locale)}
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-black text-[#2c3340] truncate">
              {t('adminContentPlanner', locale)}
            </h1>
            <Link
              href="/planner"
              className="text-[11px] font-extrabold text-[var(--nc-coral)]"
            >
              Öppna Board / Kalender / Tabell →
            </Link>
          </div>
          <Link
            href="/admin/settings/socials"
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-zinc-600 bg-zinc-50 hover:bg-zinc-100"
          >
            <Settings2 size={14} /> {t('accounts', locale)}
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 w-fit">
            {(['month', 'week'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`h-10 min-h-[44px] px-4 rounded-lg text-xs font-extrabold transition-colors ${
                  view === v
                    ? 'bg-white text-[#2c3340] shadow-sm'
                    : 'text-zinc-500 hover:text-[#2c3340]'
                }`}
              >
                {v === 'month' ? 'Månad' : 'Vecka'}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiOpen(true)}
              className="h-11 min-h-[44px] rounded-xl font-extrabold gap-2"
            >
              <Sparkles size={14} className="text-[var(--nc-coral)]" />
              AI Content Generator
            </Button>
            <Button
              type="button"
              onClick={() => openComposer(null)}
              className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-extrabold gap-2"
            >
              <Plus size={14} /> {t('createSchedulePostBtn', locale)}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ labelKey, value, icon: Icon }) => (
            <div key={labelKey} className="nc-glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className="text-zinc-400" />
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  {t(labelKey, locale)}
                </p>
              </div>
              <p className="text-2xl font-black text-[#2c3340]">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="nc-glass rounded-[1.5rem] p-10 text-center text-sm text-zinc-400">
                {t('loadingCalendar', locale)}
              </div>
            ) : (
              <ContentCalendar
                posts={posts.filter((p) => p.status !== 'draft' || p.scheduled_at)}
                view={view}
                cursor={cursor}
                onCursorChange={setCursor}
                onSelectPost={(p) => openComposer(p)}
                onSelectDay={openForDay}
                onReschedule={(id, scheduledAt) =>
                  rescheduleMutation.mutate({ id, scheduledAt })
                }
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="nc-glass rounded-[1.5rem] p-5">
              <h3 className="text-sm font-black text-[#2c3340] mb-3 flex items-center gap-2">
                <Clock size={14} className="text-[var(--nc-coral)]" />
                {t('upcoming', locale)}
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-zinc-400 font-medium py-6 text-center">
                  Inga schemalagda inlägg.
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => openComposer(post)}
                        className="w-full text-left rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-white p-3 transition-colors"
                      >
                        <p className="text-sm font-bold text-[#2c3340] truncate mb-1">
                          {post.title || post.idea_title || post.caption.split('\n')[0]}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-medium mb-2">
                          {post.scheduled_at
                            ? new Intl.DateTimeFormat(localeTag(locale), {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(post.scheduled_at))
                            : '—'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {post.platforms.map((p) => (
                            <PlatformBadge key={p} platform={p} />
                          ))}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="nc-glass rounded-[1.5rem] p-5">
              <h3 className="text-sm font-black text-[#2c3340] mb-2 flex items-center gap-2">
                <FileText size={14} className="text-zinc-400" />
                {t('statDrafts', locale)}
              </h3>
              <ul className="space-y-2">
                {posts
                  .filter((p) => p.status === 'draft')
                  .slice(0, 4)
                  .map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => openComposer(post)}
                        className="w-full text-left text-sm font-bold text-zinc-600 truncate hover:text-[#2c3340] h-11 min-h-[44px]"
                      >
                        {post.caption.split('\n')[0] || 'Tomt utkast'}
                      </button>
                    </li>
                  ))}
                {posts.filter((p) => p.status === 'draft').length === 0 && (
                  <p className="text-sm text-zinc-400 font-medium py-4 text-center">
                    {t('noDraftsYet', locale)}
                  </p>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>

      <AiContentGenerator
        open={aiOpen}
        onOpenChange={setAiOpen}
        onUseIdea={openFromIdea}
      />

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        initial={editing}
        seedIdea={seedIdea}
        seedPlatform={seedPlatform}
        defaultScheduledAt={defaultScheduledAt}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
        }}
      />
    </div>
  );
}
