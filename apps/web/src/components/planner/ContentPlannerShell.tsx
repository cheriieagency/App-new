'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Columns3,
  LayoutList,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import PlannerKanbanBoard from '@/components/planner/PlannerKanbanBoard';
import PlannerTableView from '@/components/planner/PlannerTableView';
import ContentCalendar from '@/components/planner/ContentCalendar';
import PostStudioModal from '@/components/planner/PostStudioModal';
import AiCopilotPanel from '@/components/planner/AiCopilotPanel';
import TeamWorkspaceModal from '@/components/planner/TeamWorkspaceModal';
import WorkspaceSelector from '@/components/planner/WorkspaceSelector';
import CreateWorkspaceModal from '@/components/planner/CreateWorkspaceModal';
import {
  PLATFORM_META,
  type AiContentIdea,
  type BrandWorkspace,
  type PlannerPost,
  type PlannerTeamMember,
  type SocialPlatform,
  type WorkflowStatus,
} from '@/lib/mock-content-planner';

type ViewMode = 'board' | 'calendar' | 'table' | 'copilot';
type PlatformFilter = 'all' | SocialPlatform;

export default function ContentPlannerShell() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [workspaceId, setWorkspaceId] = useState('ws-nordic');
  const [view, setView] = useState<ViewMode>('board');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(() => new Date());
  const [studioOpen, setStudioOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [activePost, setActivePost] = useState<PlannerPost | null>(null);

  const { data: wsData } = useQuery<{ workspaces: BrandWorkspace[] }>({
    queryKey: ['planner-workspaces'],
    queryFn: async () => {
      const r = await fetch('/api/planner/workspaces');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!session,
  });

  const workspaces = wsData?.workspaces ?? [];
  const activeWorkspace =
    workspaces.find((w) => w.id === workspaceId) || workspaces[0] || null;
  const project = activeWorkspace?.name ?? 'Nordic Creator Launch';

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
        Laddar…
      </div>
    );
  }
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  return (
    <div className="nc-app nc-app-shell min-h-screen">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 space-y-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 h-11 min-h-[44px] px-2 rounded-xl text-xs font-extrabold text-zinc-500 hover:bg-zinc-50"
            >
              <ArrowLeft size={14} /> Admin
            </Link>

            <WorkspaceSelector
              workspaces={workspaces}
              activeId={activeWorkspace?.id ?? workspaceId}
              onSelect={(ws) => setWorkspaceId(ws.id)}
              onCreateNew={() => setCreateWsOpen(true)}
            />

            <div className="flex-1 relative min-w-0">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök inlägg…"
                className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm font-medium focus:outline-none focus:border-[var(--nc-coral)] focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setTeamOpen(true)}
              className="hidden sm:flex items-center -space-x-2 flex-shrink-0 h-11 min-h-[44px] pl-1 pr-2 rounded-full hover:bg-zinc-50 transition-colors"
              title="Hantera team"
              aria-label="Hantera teammedlemmar"
            >
              {teamAvatars.map((m) => (
                <img
                  key={m.id}
                  src={m.avatar_url}
                  alt={m.name}
                  title={m.name}
                  className="w-9 h-9 rounded-full border-2 border-white object-cover"
                />
              ))}
              <span className="relative z-10 w-9 h-9 rounded-full border-2 border-white bg-zinc-100 text-zinc-500 text-xs font-black flex items-center justify-center">
                +
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTeamOpen(true)}
              className="sm:hidden h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center text-sm font-black"
              aria-label="Team"
            >
              {(teamAvatars[0]?.name?.[0] ?? 'T')}
            </button>

            <Link
              href="/admin/settings/socials"
              className="hidden md:inline-flex h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 items-center gap-1.5"
            >
              <Settings2 size={14} /> Konton
            </Link>

            <Button
              type="button"
              onClick={() => openStudio(null)}
              className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-extrabold gap-1.5 px-3 sm:px-4"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Skapa Inlägg</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 w-fit overflow-x-auto scrollbar-none max-w-full">
              {(
                [
                  { key: 'board' as const, label: 'Progress', icon: Columns3 },
                  { key: 'calendar' as const, label: 'Kalender', icon: CalendarDays },
                  { key: 'table' as const, label: 'Tabell', icon: LayoutList },
                  { key: 'copilot' as const, label: 'AI Copilot', icon: Sparkles },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`inline-flex items-center gap-1.5 h-10 min-h-[44px] px-3 rounded-lg text-xs font-extrabold transition-colors flex-shrink-0 ${
                    view === key
                      ? 'bg-white text-[#2c3340] shadow-sm'
                      : 'text-zinc-500 hover:text-[#2c3340]'
                  }`}
                >
                  <Icon
                    size={13}
                    className={
                      key === 'copilot' && view !== 'copilot'
                        ? 'text-[var(--nc-coral)]'
                        : undefined
                    }
                  />
                  {label}
                </button>
              ))}
            </div>

            {view !== 'copilot' && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {(
                  [
                    { key: 'all' as const, label: 'Alla', color: '#71717a' },
                    ...(['instagram', 'tiktok', 'linkedin', 'youtube'] as SocialPlatform[]).map(
                      (p) => ({
                        key: p as PlatformFilter,
                        label: PLATFORM_META[p].label,
                        color: PLATFORM_META[p].color,
                      })
                    ),
                  ] as const
                ).map(({ key, label, color }) => {
                  const active = platformFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPlatformFilter(key)}
                      className={`h-10 min-h-[44px] px-3 rounded-full text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 border transition-colors ${
                        active
                          ? 'text-white border-transparent'
                          : 'bg-white text-zinc-500 border-zinc-100 hover:text-[#2c3340]'
                      }`}
                      style={active ? { background: color } : undefined}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-6 py-5 pb-16">
        {view === 'copilot' ? (
          <AiCopilotPanel
            onUseIdea={(idea, platform) => void useIdea(idea, platform)}
            onCreateFromCaption={(input) => void createDraftFromAi(input)}
          />
        ) : isLoading ? (
          <div className="nc-glass rounded-[1.5rem] p-12 text-center text-sm text-zinc-400">
            Laddar planner…
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
            onSelectDay={() => openStudio(null)}
          />
        ) : (
          <PlannerTableView posts={posts} onOpen={openStudio} />
        )}
      </main>

      <PostStudioModal
        open={studioOpen}
        onOpenChange={setStudioOpen}
        post={activePost}
        projectName={project}
        workspaces={workspaces}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['planner-posts'] })}
      />

      <TeamWorkspaceModal
        open={teamOpen}
        onOpenChange={setTeamOpen}
        projectName={project}
        workspaces={workspaces}
      />

      <CreateWorkspaceModal
        open={createWsOpen}
        onOpenChange={setCreateWsOpen}
        onCreated={(ws) => {
          queryClient.invalidateQueries({ queryKey: ['planner-workspaces'] });
          setWorkspaceId(ws.id);
        }}
      />
    </div>
  );
}
