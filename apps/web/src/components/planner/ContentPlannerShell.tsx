'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Columns3,
  LayoutGrid,
  LayoutList,
  NotebookPen,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PlannerProgressGrid from '@/components/planner/PlannerProgressGrid';
import PlannerTableView from '@/components/planner/PlannerTableView';
import ContentCalendar from '@/components/planner/ContentCalendar';
import PostStudioModal from '@/components/planner/PostStudioModal';
import AiCopilotPanel from '@/components/planner/AiCopilotPanel';
import FeedGridPlanner from '@/components/planner/FeedGridPlanner';
import PlannerNotesPanel from '@/components/planner/PlannerNotesPanel';
import TeamWorkspaceModal from '@/components/planner/TeamWorkspaceModal';
import { AdminPageHeader } from '@/components/admin/AdminUi';
import Link from 'next/link';
import { useWorkspace } from '@/context/WorkspaceContext';
import { usePendingApiPlatformAccess } from '@/hooks/usePendingApiPlatformAccess';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import {
  PLATFORM_META,
  type AiContentIdea,
  type PlannerPost,
  type PlannerTeamMember,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import {
  isPlatformImportedPost,
  mergePlannerWithPlatformPosts,
} from '@/lib/planner/platform-posts';

const PLATFORM_ICONS: Record<
  SocialPlatform,
  typeof InstagramIcon
> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
  pinterest: PinterestIcon,
};

type ViewMode = 'board' | 'calendar' | 'table' | 'feed' | 'notes' | 'copilot';
type PlatformFilter = 'all' | SocialPlatform;

/** Soft header actions — warm canvas, muted contrast. */
const OUTLINE_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-sm bg-transparent text-[9px] font-medium uppercase tracking-[0.08em] text-[#8A857D] hover:bg-[#F0EFEA] hover:text-[#2C2621] transition-colors';
const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-3 sm:px-3.5 rounded-sm bg-[#F0EFEA] text-[#2C2621] text-[9px] font-medium uppercase tracking-[0.08em] hover:bg-[#E6E3DB] transition-colors';
const CHIP_ON =
  'bg-[#F0EFEA] text-[#2C2621] border border-transparent';
const CHIP_OFF =
  'bg-transparent text-[#8A857D] border border-transparent hover:bg-[#F0EFEA]/70 hover:text-[#2C2621]';
const SEARCH_INPUT =
  'w-full bg-white text-xs rounded-sm border border-[#E6E3DB] font-normal text-[#2C2621] placeholder:text-[#8A857D] focus:outline-none focus:ring-0 focus:border-[#2C2621]';

type ContentPlannerShellProps = {
  /** When set, only posts tagged with this campaign/project are shown. */
  campaignId?: string | null;
  /** Skip sticky top chrome — admin shell already provides it. */
  embedded?: boolean;
  eyebrow?: string;
  title?: ReactNode;
  description?: string;
  /** Extra actions rendered next to platform/view controls (e.g. New project). */
  headerExtra?: ReactNode;
};

export default function ContentPlannerShell({
  campaignId = null,
  embedded = false,
  eyebrow,
  title,
  description,
  headerExtra,
}: ContentPlannerShellProps) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const {
    brandWorkspaces: workspaces,
    activeWorkspaceId,
    activeWorkspace,
  } = useWorkspace();
  const { filterPlatforms } = usePendingApiPlatformAccess();

  const [view, setView] = useState<ViewMode>('board');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(() => new Date());
  const [studioOpen, setStudioOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [activePost, setActivePost] = useState<PlannerPost | null>(null);
  const [defaultScheduledAt, setDefaultScheduledAt] = useState<string | null>(null);

  const plannerPlatformFilters = filterPlatforms([
    'instagram',
    'facebook',
    'tiktok',
    'linkedin',
    'youtube',
    'pinterest',
  ] as const);

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

  // Live posts already on IG / FB / TikTok (including ones not published via Clikd).
  const { data: platformData } = useQuery<{ posts: PlannerPost[] }>({
    queryKey: ['planner-platform-posts', activeWorkspaceId, project],
    queryFn: async () => {
      const qs = new URLSearchParams({
        project,
        ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}),
      });
      const r = await fetch(`/api/planner/platform-posts?${qs}`, {
        credentials: 'include',
        headers: activeWorkspaceId
          ? {
              'x-workspace-id': activeWorkspaceId,
              'x-active-workspace-id': activeWorkspaceId,
            }
          : undefined,
      });
      if (!r.ok) return { posts: [] };
      return r.json();
    },
    enabled: !!session && !!activeWorkspaceId,
    staleTime: 60_000,
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

  /** Soft confirm + DELETE planner_posts row (drafts / ideas / scheduled Clikd posts). */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (!r.ok) throw new Error('delete failed');
      const json = (await r.json()) as { ok?: boolean };
      if (json.ok === false) throw new Error('delete failed');
      return json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['planner-platform-posts'] });
      toast.success(t('toastPostDeleted', locale));
    },
    onError: () => {
      toast.error('Could not delete post. Try again.');
    },
  });

  const requestDeletePost = (postOrId: PlannerPost | string) => {
    const post =
      typeof postOrId === 'string' ? ({ id: postOrId } as PlannerPost) : postOrId;
    if (isPlatformImportedPost(post)) return;
    if (!window.confirm(t('confirmDeletePost', locale))) return;
    // Close studio if the open draft is the one being removed.
    if (activePost?.id === post.id) {
      setStudioOpen(false);
      setActivePost(null);
    }
    deleteMutation.mutate(post.id);
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
      return r.json() as Promise<{ posts: PlannerPost[] }>;
    },
    onMutate: async ({ id, scheduledAt }) => {
      await queryClient.cancelQueries({ queryKey: ['planner-posts', project] });
      const prev = queryClient.getQueryData<{ posts: PlannerPost[] }>([
        'planner-posts',
        project,
      ]);
      if (prev) {
        queryClient.setQueryData(['planner-posts', project], {
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === id
              ? {
                  ...p,
                  scheduled_at: scheduledAt.toISOString(),
                  workflow:
                    p.workflow === 'IDEA' ||
                    p.workflow === 'IN_PROGRESS' ||
                    p.workflow === 'READY'
                      ? 'SCHEDULED'
                      : p.workflow,
                  status:
                    p.workflow === 'PUBLISHED' || p.status === 'published'
                      ? p.status
                      : 'scheduled',
                }
              : p
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['planner-posts', project], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
    },
  });

  const defaultCampaignIds = useMemo(
    () => (campaignId ? [campaignId] : undefined),
    [campaignId]
  );

  const posts = useMemo(() => {
    let list = data?.posts ?? [];
    // Scope to a single project/campaign when opened from Projects nav.
    if (campaignId) {
      list = list.filter((p) => (p.campaigns ?? []).includes(campaignId));
    }
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
  }, [data?.posts, campaignId, platformFilter, search]);

  /** Clikd posts + connected-profile publishes (calendar + feed grid). */
  const mergedPosts = useMemo(() => {
    let platformList = platformData?.posts ?? [];
    if (platformFilter !== 'all') {
      platformList = platformList.filter((p) =>
        p.platforms.includes(platformFilter)
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      platformList = platformList.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.caption.toLowerCase().includes(q) ||
          p.hashtags.toLowerCase().includes(q)
      );
    }
    // Campaign-scoped views stay Clikd-only (platform imports have no campaign tags).
    if (campaignId) return posts;
    return mergePlannerWithPlatformPosts(posts, platformList);
  }, [posts, platformData?.posts, platformFilter, search, campaignId]);

  const openStudio = (post?: PlannerPost | null) => {
    // Platform-imported posts open on the network, not Post Studio.
    if (post && isPlatformImportedPost(post)) {
      if (post.permalink) {
        window.open(post.permalink, '_blank', 'noopener,noreferrer');
      }
      return;
    }
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
        // Auto-tag AI drafts when creating inside a project view.
        campaigns: campaignId ? [campaignId] : undefined,
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

  // Feed Grid lives on the main Planner only — Projects use Visionboard instead.
  const showFeedTab = !embedded && !campaignId;

  const viewTabs = (
    [
      { key: 'board' as const, label: t('boardKanban', locale), icon: Columns3 },
      { key: 'calendar' as const, label: t('calendarTab', locale), icon: CalendarDays },
      { key: 'table' as const, label: t('tableTab', locale), icon: LayoutList },
      ...(showFeedTab &&
      (platformFilter === 'all' ||
        platformFilter === 'instagram' ||
        platformFilter === 'tiktok')
        ? [{ key: 'feed' as const, label: t('feedGridTab', locale), icon: LayoutGrid }]
        : []),
      { key: 'notes' as const, label: t('notesTab', locale), icon: NotebookPen },
      { key: 'copilot' as const, label: t('aiCopilot', locale), icon: Sparkles },
    ] as const
  );

  const pageHeader = (
    <div className="space-y-4 min-w-0">
      {/* Title row — keep actions light so chips never fight the headline */}
      <AdminPageHeader
        compact
        eyebrow={eyebrow ?? t('adminContentPlanner', locale)}
        title={title ?? t('adminNavPlanner', locale)}
        description={
          description ??
          (activeWorkspace
            ? `${activeWorkspace.name} · ${activeWorkspace.handle}`
            : undefined)
        }
        actions={
          headerExtra ? (
            <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
              {headerExtra}
            </div>
          ) : undefined
        }
      />

      {/* Full-width toolbars — stack so platform + view controls never overlap */}
      <div className="flex flex-col gap-3 min-w-0 w-full">
        <div
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none pb-0.5 -mx-1 px-1"
          role="toolbar"
          aria-label={t('allPlatforms', locale)}
        >
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`inline-flex items-center text-[9px] font-medium uppercase tracking-[0.08em] px-2.5 min-h-[32px] whitespace-nowrap flex-shrink-0 rounded-sm transition-colors ${
              platformFilter === 'all' ? CHIP_ON : CHIP_OFF
            }`}
          >
            {t('allPlatforms', locale)}
          </button>
          {plannerPlatformFilters.map((p) => {
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
                className={`inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.08em] px-2.5 min-h-[32px] whitespace-nowrap flex-shrink-0 rounded-sm transition-colors ${
                  active ? CHIP_ON : CHIP_OFF
                }`}
              >
                <Icon
                  size={12}
                  className={active ? 'text-[#2C2621]' : 'text-[#A8A29E]'}
                />
                {PLATFORM_META[p].label}
              </button>
            );
          })}
        </div>

        <div
          className="inline-flex max-w-full overflow-x-auto overscroll-x-contain scrollbar-none rounded-sm bg-[#F0EFEA]/50"
          role="tablist"
          aria-label={t('adminNavPlanner', locale)}
        >
          {viewTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-1.5 h-8 min-h-[32px] px-2.5 text-[9px] font-medium uppercase tracking-[0.08em] whitespace-nowrap flex-shrink-0 rounded-sm transition-colors ${
                view === key
                  ? 'bg-white text-[#2C2621] shadow-[0_0_0_1px_rgba(230,227,219,0.9)]'
                  : 'bg-transparent text-[#8A857D] hover:text-[#2C2621]'
              }`}
            >
              <Icon
                size={11}
                className={
                  key === 'copilot' && view !== 'copilot'
                    ? 'text-[#B85C38]'
                    : view === key
                      ? 'text-[#2C2621]'
                      : 'text-[#A8A29E]'
                }
              />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const views = (
    <>
      {view === 'copilot' ? (
        <AiCopilotPanel
          onUseIdea={(idea, platform) => void useIdea(idea, platform)}
          onCreateFromCaption={(input) => void createDraftFromAi(input)}
        />
      ) : view === 'notes' ? (
        <PlannerNotesPanel workspaceId={activeWorkspaceId} />
      ) : isLoading ? (
        <div className="bg-white border border-[#E6E3DB] rounded-sm p-12 text-center">
          <p className="text-xs font-medium text-[#8A857D]">{t('loadingPlanner', locale)}</p>
        </div>
      ) : view === 'board' ? (
        <PlannerProgressGrid
          posts={mergedPosts}
          cursor={cursor}
          onCursorChange={setCursor}
          onOpen={openStudio}
          onAddDay={openStudioForDay}
        />
      ) : view === 'calendar' ? (
        <ContentCalendar
          posts={mergedPosts.filter(
            (p) => p.workflow === 'SCHEDULED' || p.workflow === 'PUBLISHED' || p.scheduled_at
          )}
          view="month"
          cursor={cursor}
          onCursorChange={setCursor}
          onSelectPost={openStudio}
          onSelectDay={openStudioForDay}
          onReschedule={(id, scheduledAt) => {
            if (
              id.startsWith('platform:') ||
              id.startsWith('meta-ig-')
            ) {
              return;
            }
            rescheduleMutation.mutate({ id, scheduledAt });
          }}
        />
      ) : view === 'feed' && showFeedTab ? (
        <FeedGridPlanner
          posts={mergedPosts}
          workspace={workspaces.find((w) => w.id === activeWorkspaceId) ?? null}
          activePlatform={
            platformFilter === 'instagram' || platformFilter === 'tiktok'
              ? platformFilter
              : platformFilter === 'all'
                ? 'all'
                : null
          }
          onOpen={openStudio}
          onDelete={requestDeletePost}
          onRefresh={async () => {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['planner-posts'] }),
              queryClient.invalidateQueries({
                queryKey: ['planner-platform-posts'],
              }),
            ]);
          }}
        />
      ) : (
        <PlannerTableView
          posts={posts}
          onOpen={openStudio}
          onDelete={requestDeletePost}
        />
      )}
    </>
  );

  const modals = (
    <>
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
        defaultCampaignIds={defaultCampaignIds}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['planner-posts'] })}
        onDeleted={() => {
          setStudioOpen(false);
          setActivePost(null);
          void queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
        }}
      />

      <TeamWorkspaceModal
        open={teamOpen}
        onOpenChange={setTeamOpen}
        projectName={project}
        workspaces={workspaces}
      />
    </>
  );

  // Embedded in admin Projects: reuse planner views without a second sticky bar.
  if (embedded) {
    return (
      <div className="space-y-6">
        <div className="relative w-full max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPosts', locale)}
            className={`${SEARCH_INPUT} pl-10 pr-3 py-2.5 min-h-[44px]`}
          />
        </div>
        {pageHeader}
        {views}
        {modals}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2C2621]">
      {/* Top navbar — create-post warm canvas */}
      <header className="sticky top-0 z-30 h-16 bg-[#F9F8F6]/95 backdrop-blur-md border-b border-[#E6E3DB] px-4 sm:px-8 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md hidden sm:block flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPosts', locale)}
            className={`${SEARCH_INPUT} max-w-md pl-10 pr-14 py-2 min-h-[40px]`}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center border border-[#E6E3DB] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#A8A29E]">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setTeamOpen(true)}
            className="hidden sm:flex items-center -space-x-2 min-h-[36px] px-1 rounded-sm hover:bg-[#F0EFEA]/70 transition-colors"
            title={t('teamTab', locale)}
            aria-label={t('teamMembersAria', locale)}
          >
            {teamAvatars.slice(0, 4).map((m) => (
              <img
                key={m.id}
                src={m.avatar_url}
                alt={m.name}
                title={m.name}
                className="w-7 h-7 rounded-full border-2 border-[#F9F8F6] object-cover opacity-90"
              />
            ))}
            <span className="relative z-10 w-7 h-7 rounded-full border-2 border-[#F9F8F6] bg-[#E6E3DB]/80 text-[#8A857D] text-[9px] font-medium flex items-center justify-center">
              +
            </span>
          </button>

          <LanguageSwitcher className="hidden lg:block [&_button]:bg-transparent [&_button]:border-0 [&_button]:shadow-none [&_button]:h-8 [&_button]:min-h-[32px] [&_button]:text-[#8A857D] [&_button]:hover:text-[#2C2621] [&_button]:hover:bg-[#F0EFEA] [&_button]:rounded-sm [&_button]:px-2 [&_button]:text-[9px] [&_button]:font-medium [&_button]:uppercase [&_button]:tracking-[0.08em]" />

          <Link href="/admin/settings/socials" className={`hidden md:inline-flex ${OUTLINE_BTN}`}>
            <Settings2 size={12} strokeWidth={1.75} /> {t('accounts', locale)}
          </Link>

          <button
            type="button"
            onClick={() => openStudio(null)}
            className={PRIMARY_BTN}
          >
            <Plus size={12} strokeWidth={2} />
            <span className="hidden sm:inline">{t('createPost', locale)}</span>
          </button>
        </div>
      </header>

      {/* Mobile search */}
      <div className="sm:hidden px-4 pt-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPosts', locale)}
            className={`${SEARCH_INPUT} pl-9 pr-3 py-2.5 min-h-[44px]`}
          />
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 md:pb-16 space-y-6">
        {pageHeader}
        {views}
      </main>

      {modals}
    </div>
  );
}
