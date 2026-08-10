'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Columns3,
  LayoutGrid,
  LayoutList,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PlannerKanbanBoard from '@/components/planner/PlannerKanbanBoard';
import PlannerTableView from '@/components/planner/PlannerTableView';
import ContentCalendar from '@/components/planner/ContentCalendar';
import PostStudioModal from '@/components/planner/PostStudioModal';
import AiCopilotPanel from '@/components/planner/AiCopilotPanel';
import FeedGridPlanner from '@/components/planner/FeedGridPlanner';
import TeamWorkspaceModal from '@/components/planner/TeamWorkspaceModal';
import SocialAccountsModal from '@/components/planner/SocialAccountsModal';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import {
  PLATFORM_META,
  type AiContentIdea,
  type PlannerPost,
  type PlannerTeamMember,
  type SocialPlatform,
  type WorkflowStatus,
} from '@/lib/mock-content-planner';

const PLATFORM_ICONS: Record<
  SocialPlatform,
  typeof InstagramIcon
> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
};

type ViewMode = 'board' | 'calendar' | 'table' | 'feed' | 'copilot';
type PlatformFilter = 'all' | SocialPlatform;

export default function ContentPlannerShell() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const {
    brandWorkspaces: workspaces,
    activeWorkspaceId,
    activeWorkspace,
  } = useWorkspace();

  const [view, setView] = useState<ViewMode>('board');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(() => new Date());
  const [studioOpen, setStudioOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [activePost, setActivePost] = useState<PlannerPost | null>(null);
  const [defaultScheduledAt, setDefaultScheduledAt] = useState<string | null>(null);

  const project = activeWorkspace?.name ?? 'Ebba Creator Lab';

  const { data, isLoading } = useQuery<{ posts: PlannerPost[] }>({
    queryKey: ['planner-posts', project],
    queryFn: async () => {
      const r = await fetch(`/api/planner?project=${encodeURIComponent(project)}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!session && !!activeWorkspace,
  });

  const { data: teamData } = useQuery<{
    all_members: PlannerTeamMember[];
    plan: string;
  }>({
    queryKey: ['planner-team'],
    queryFn: async () => {
      const r = await fetch('/api/planner/team');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!session,
  });

  // Header avatars = members of the active brand workspace.
  const teamAvatars = (teamData?.all_members ?? [])
    .filter((m) => m.project === project)
    .slice(0, 5);

  const moveMutation = useMutation({
    mutationFn: async ({ id, workflow }: { id: string; workflow: WorkflowStatus }) => {
      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', id, workflow, actor: 'Ebba' }),
      });
      if (!r.ok) throw new Error('move failed');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
    },
  });

  const posts = useMemo(() => {
    let list = data?.posts ?? [];
    if (platformFilter !== 'all') {
      list = list.filter((p) => p.platforms.includes(platformFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.caption.toLowerCase().includes(q) ||
          p.hashtags.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.posts, platformFilter, search]);

  const openStudio = (post?: PlannerPost | null) => {
    setActivePost(post ?? null);
    setDefaultScheduledAt(null);
    setStudioOpen(true);
  };

  /** Open "+ create post" pre-scheduled for a calendar day (10:00 local). */
  const openStudioForDay = (day: Date) => {
    setActivePost(null);
    const d = new Date(day);
    d.setHours(10, 0, 0, 0);
    setDefaultScheduledAt(d.toISOString());
    setStudioOpen(true);
  };

  const createDraftFromAi = async (input: {
    title: string;
    caption: string;
    hashtags?: string;
    platforms: SocialPlatform[];
  }) => {
    const r = await fetch('/api/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        title: input.title,
        caption: input.caption,
        hashtags: input.hashtags ?? '',
        platforms: input.platforms,
        workflow: 'IDEA',
        project,
        actor: 'Ebba',
      }),
    });
    if (!r.ok) return;
    const data = await r.json();
    await queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
    openStudio(data.post);
  };

  const useIdea = async (idea: AiContentIdea, platform: SocialPlatform) => {
    const caption = idea.captions[platform] || Object.values(idea.captions)[0] || '';
    const hashtags = (caption.match(/#[\wåäöÅÄÖ]+/gi) ?? []).join(' ');
    await createDraftFromAi({
      title: idea.title,
      caption,
      hashtags,
      platforms: (Object.keys(idea.captions) as SocialPlatform[]).length
        ? (Object.keys(idea.captions) as SocialPlatform[])
        : [platform],
    });
  };

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

  const viewTabs = (
    [
      { key: 'board' as const, label: t('boardKanban', locale), icon: Columns3 },
      { key: 'calendar' as const, label: t('calendarTab', locale), icon: CalendarDays },
      { key: 'table' as const, label: t('tableTab', locale), icon: LayoutList },
      ...(platformFilter === 'all' ||
      platformFilter === 'instagram' ||
      platformFilter === 'tiktok'
        ? [{ key: 'feed' as const, label: t('feedGridTab', locale), icon: LayoutGrid }]
        : []),
      { key: 'copilot' as const, label: t('aiCopilot', locale), icon: Sparkles },
    ] as const
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top navbar — matches admin shell */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md hidden sm:block flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPosts', locale)}
            className="w-full max-w-md bg-white text-sm rounded-xl border border-slate-200/90 pl-10 pr-14 py-2 min-h-[40px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setTeamOpen(true)}
            className="hidden sm:flex items-center -space-x-2 min-h-[44px] pr-1"
            title={t('teamTab', locale)}
            aria-label={t('teamMembersAria', locale)}
          >
            {teamAvatars.slice(0, 4).map((m) => (
              <img
                key={m.id}
                src={m.avatar_url}
                alt={m.name}
                title={m.name}
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
              />
            ))}
            <span className="relative z-10 w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">
              +
            </span>
          </button>

          <LanguageSwitcher className="hidden lg:block [&_button]:bg-transparent [&_button]:border-0 [&_button]:shadow-none [&_button]:h-9 [&_button]:min-h-[36px] [&_button]:text-slate-500 [&_button]:px-2 [&_button]:text-xs [&_button]:font-semibold" />

          <button
            type="button"
            onClick={() => setAccountsOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Settings2 size={14} /> {t('accounts', locale)}
          </button>

          <button
            type="button"
            onClick={() => openStudio(null)}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 sm:px-4 py-2 min-h-[40px] rounded-xl transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">{t('createPost', locale)}</span>
          </button>
        </div>
      </header>

      {/* Mobile search */}
      <div className="sm:hidden px-4 pt-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPosts', locale)}
            className="w-full bg-white text-sm rounded-xl border border-slate-200/90 pl-9 pr-3 py-2.5 min-h-[44px] font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 md:pb-16 space-y-6">
        <AdminPageHeader
          eyebrow="Content Planner"
          title="Planner"
          description={activeWorkspace ? `${activeWorkspace.name} · ${activeWorkspace.handle}` : undefined}
          actions={
            <div className="flex gap-0.5 overflow-x-auto scrollbar-none p-1 rounded-xl bg-slate-100/80 border border-slate-200/80">
              {viewTabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-lg text-xs transition-all flex-shrink-0 ${
                    view === key
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-500 font-medium hover:text-slate-800'
                  }`}
                >
                  <Icon
                    size={13}
                    className={
                      key === 'copilot' && view !== 'copilot' ? 'text-[#F472B6]' : undefined
                    }
                  />
                  {label}
                </button>
              ))}
            </div>
          }
        />

        {/* Platform filters */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mt-2">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`text-xs px-3.5 py-1.5 min-h-[36px] rounded-xl whitespace-nowrap flex-shrink-0 transition-colors ${
              platformFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white text-slate-600 border border-slate-200/80 font-semibold hover:bg-slate-50'
            }`}
          >
            {t('allPlatforms', locale)}
          </button>
          {(['instagram', 'tiktok', 'linkedin', 'youtube'] as SocialPlatform[]).map((p) => {
            const active = platformFilter === p;
            const Icon = PLATFORM_ICONS[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPlatformFilter(p);
                  if (view === 'feed' && p !== 'instagram' && p !== 'tiktok') {
                    setView('board');
                  }
                }}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[36px] rounded-xl whitespace-nowrap flex-shrink-0 font-semibold transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Icon size={13} className={active ? 'text-white' : undefined} />
                {PLATFORM_META[p].label}
              </button>
            );
          })}
        </div>

        {view === 'copilot' ? (
          <AiCopilotPanel
            onUseIdea={(idea, platform) => void useIdea(idea, platform)}
            onCreateFromCaption={(input) => void createDraftFromAi(input)}
          />
        ) : isLoading ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            {t('loadingPlanner', locale)}
          </div>
        ) : view === 'board' ? (
          <PlannerKanbanBoard
            posts={posts}
            onOpen={openStudio}
            onMove={(id, workflow) => moveMutation.mutate({ id, workflow })}
          />
        ) : view === 'calendar' ? (
          <ContentCalendar
            posts={posts.filter(
              (p) => p.workflow === 'SCHEDULED' || p.workflow === 'PUBLISHED' || p.scheduled_at
            )}
            view="month"
            cursor={cursor}
            onCursorChange={setCursor}
            onSelectPost={openStudio}
            onSelectDay={openStudioForDay}
          />
        ) : view === 'feed' ? (
          <FeedGridPlanner
            posts={posts}
            workspace={workspaces.find((w) => w.id === activeWorkspaceId) ?? null}
            activePlatform={
              platformFilter === 'instagram' || platformFilter === 'tiktok'
                ? platformFilter
                : platformFilter === 'all'
                  ? 'all'
                  : null
            }
            onOpen={openStudio}
            onRefresh={async () => {
              await queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
            }}
          />
        ) : (
          <PlannerTableView posts={posts} onOpen={openStudio} />
        )}
      </main>

      <PostStudioModal
        open={studioOpen}
        onOpenChange={(open) => {
          setStudioOpen(open);
          if (!open) setDefaultScheduledAt(null);
        }}
        post={activePost}
        projectName={project}
        workspaces={workspaces}
        defaultScheduledAt={defaultScheduledAt}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['planner-posts'] })}
      />

      <TeamWorkspaceModal
        open={teamOpen}
        onOpenChange={setTeamOpen}
        projectName={project}
        workspaces={workspaces}
      />

      <SocialAccountsModal open={accountsOpen} onOpenChange={setAccountsOpen} />
    </div>
  );
}
