'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Check,
  ChevronDown,
  FileText,
  FolderKanban,
  Hash,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Smile,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CarouselMediaUploader from '@/components/planner/CarouselMediaUploader';
import FeedPreview from '@/components/planner/FeedPreview';
import useUpload from '@/utils/useUpload';
import {
  PLANNER_TEAM,
  WORKFLOW_COLUMNS,
  getBrandWorkspace,
  nextSubtaskId,
  type BrandWorkspace,
  type PlannerAssignee,
  type PlannerComment,
  type PlannerMediaItem,
  type CampaignLabel,
  type PlannerPost,
  type PlannerSubtask,
  type SocialPlatform,
  type WorkflowStatus,
} from '@/lib/mock-content-planner';
import { useLocale } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import {
  listFavoriteHashtags,
  mergeHashtagStrings,
  normalizeHashtagString,
  removeFavoriteHashtags,
  saveFavoriteHashtags,
  type FavoriteHashtagSet,
} from '@/lib/planner/favorite-hashtags';

const WORKFLOW_LABEL_KEYS: Record<WorkflowStatus, TranslationKey> = {
  IDEA: 'workflowIdeas',
  IN_PROGRESS: 'workflowInProduction',
  READY: 'workflowReview',
  SCHEDULED: 'workflowScheduled',
  PUBLISHED: 'workflowPublished',
};

const EMOJIS = ['🔥', '✨', '🙌', '💡', '🚀', '❤️', '👍', '🎯', '✅', '😊'];

const PLATFORM_OPTIONS: { key: SocialPlatform; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
];

const PROJECT_COLORS = [
  '#F472B6',
  '#9089F0',
  '#10B981',
  '#F59E0B',
  '#2B2568',
  '#0EA5E9',
];

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Nyss';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function PostStudioModal({
  open,
  onOpenChange,
  post,
  projectName,
  workspaces,
  defaultScheduledAt = null,
  defaultCampaignIds,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PlannerPost | null;
  projectName: string;
  workspaces: BrandWorkspace[];
  /** When creating a new post from a calendar day, prefill schedule time. */
  defaultScheduledAt?: string | null;
  /** Prefill project/campaign tags for new posts (e.g. opened from a Project view). */
  defaultCampaignIds?: string[];
  onSaved: () => void;
}) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const workspaceCtx = useWorkspaceOptional();
  const workspaceId = workspaceCtx?.activeWorkspace?.id || '';
  const { data: socialsData } = useSocialAccounts(open);
  const connectedPlatforms = useMemo(() => {
    const set = new Set<SocialPlatform>();
    for (const a of socialsData?.accounts || []) {
      if (a.connected) set.add(a.platform as SocialPlatform);
    }
    return set;
  }, [socialsData?.accounts]);
  const [leftTab, setLeftTab] = useState<'media' | 'preview'>('media');
  const [rightTab, setRightTab] = useState<'private' | 'public'>('private');
  /** Mobile app layout: one pane at a time. Desktop keeps 3 columns. */
  const [mobilePane, setMobilePane] = useState<'details' | 'media' | 'team'>('details');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['instagram']);
  const [workflow, setWorkflow] = useState<WorkflowStatus>('IDEA');
  const [project, setProject] = useState(projectName);
  const [scheduledAt, setScheduledAt] = useState('');
  const [autoPost, setAutoPost] = useState(false);
  const [assignees, setAssignees] = useState<PlannerAssignee[]>([]);
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<PlannerSubtask[]>([]);
  const [mediaItems, setMediaItems] = useState<PlannerMediaItem[]>([]);
  const [newTask, setNewTask] = useState('');
  const [comment, setComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [sending, setSending] = useState(false);
  const [localComments, setLocalComments] = useState<PlannerComment[]>([]);
  const [localActivity, setLocalActivity] = useState(post?.activity ?? []);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const [upload, { loading: uploadingComment }] = useUpload();

  const activeBrand =
    getBrandWorkspace(project) ||
    workspaces.find((w) => w.name === project) ||
    workspaces[0] ||
    null;

  const { data: campaignsData } = useQuery<{ campaigns: CampaignLabel[] }>({
    queryKey: ['planner-campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/planner/campaigns', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: open,
  });
  const campaignLabels = campaignsData?.campaigns ?? [];

  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [favoriteHashtags, setFavoriteHashtags] = useState<FavoriteHashtagSet[]>(
    []
  );

  useEffect(() => {
    if (!open) {
      setCreatingProject(false);
      setNewProjectName('');
      setNewProjectColor(PROJECT_COLORS[0]);
      return;
    }
    setFavoriteHashtags(listFavoriteHashtags(workspaceId));
  }, [open, workspaceId]);

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create',
          name: newProjectName.trim(),
          color: newProjectColor,
        }),
      });
      if (!r.ok) throw new Error('create failed');
      return r.json() as Promise<{ campaign: CampaignLabel }>;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      setCampaignIds((prev) =>
        prev.includes(data.campaign.id) ? prev : [...prev, data.campaign.id]
      );
      setCreatingProject(false);
      setNewProjectName('');
      setNewProjectColor(PROJECT_COLORS[0]);
      toast.success(t('createProject', locale));
    },
    onError: () => {
      toast.error('Could not create project');
    },
  });

  useEffect(() => {
    if (!open) return;
    if (post) {
      setTitle(post.title);
      setCaption(post.caption);
      setHashtags(post.hashtags);
      setPlatforms(post.platforms);
      setWorkflow(post.workflow);
      setProject(post.project);
      setScheduledAt(toLocalInputValue(post.scheduled_at));
      setAutoPost(post.auto_post);
      setAssignees(post.assignees);
      setCampaignIds(post.campaigns ?? []);
      setSubtasks(post.subtasks);
      setMediaItems(post.media_items ?? []);
      setLocalComments(post.comments ?? []);
      setLocalActivity(post.activity ?? []);
    } else {
      setTitle('');
      setCaption('');
      setHashtags('');
      setPlatforms(
        (['instagram', 'facebook', 'tiktok'] as SocialPlatform[]).filter((p) =>
          connectedPlatforms.has(p)
        ).length
          ? (['instagram', 'facebook', 'tiktok'] as SocialPlatform[]).filter(
              (p) => connectedPlatforms.has(p)
            )
          : ['instagram']
      );
      setWorkflow(defaultScheduledAt ? 'SCHEDULED' : 'IDEA');
      setProject(projectName);
      setScheduledAt(defaultScheduledAt ? toLocalInputValue(defaultScheduledAt) : '');
      setAutoPost(Boolean(defaultScheduledAt));
      setAssignees([PLANNER_TEAM[0]]);
      setCampaignIds(defaultCampaignIds?.length ? [...defaultCampaignIds] : []);
      setSubtasks([]);
      setMediaItems([]);
      setLocalComments([]);
      setLocalActivity([]);
    }
    setLeftTab('media');
    setRightTab('private');
    setMobilePane('details');
    setComment('');
    setCommentImage(null);
  }, [open, post, projectName, defaultScheduledAt, defaultCampaignIds]);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleCampaign = (id: string) => {
    setCampaignIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAssignee = (a: PlannerAssignee) => {
    setAssignees((prev) =>
      prev.some((x) => x.id === a.id)
        ? prev.filter((x) => x.id !== a.id)
        : [...prev, a]
    );
  };

  const polish = async () => {
    if (!caption.trim() || polishing) return;
    setPolishing(true);
    try {
      const r = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'polish', caption }),
      });
      const data = await r.json();
      if (data.caption) setCaption(data.caption);
    } finally {
      setPolishing(false);
    }
  };

  const derivedTitle =
    title.trim() ||
    caption.split('\n')[0]?.trim().slice(0, 72) ||
    t('newPostDefault', locale);

  const save = async (
    mode: 'draft' | 'schedule' | 'post'
  ) => {
    if (!caption.trim() || platforms.length === 0 || saving) return;

    if (mode === 'schedule' && !scheduledAt) {
      toast.error('Pick a schedule date & time first');
      return;
    }

    if (mode === 'post') {
      const liveTargets = platforms.filter((p) =>
        connectedPlatforms.has(p)
      );
      if (liveTargets.length === 0) {
        toast.error(
          'Connect Instagram or Facebook under Settings → Socials for this workspace'
        );
        return;
      }
    }

    setSaving(true);
    try {
      const nextWorkflow: WorkflowStatus =
        mode === 'post'
          ? 'PUBLISHED'
          : mode === 'schedule'
            ? 'SCHEDULED'
            : 'IDEA';

      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'upsert',
          id: post?.id,
          title: derivedTitle,
          caption,
          hashtags,
          platforms,
          workflow: nextWorkflow,
          status:
            mode === 'post'
              ? 'published'
              : mode === 'schedule'
                ? 'scheduled'
                : 'draft',
          project,
          campaigns: campaignIds,
          assignees,
          subtasks,
          media_items: mediaItems,
          auto_post: mode === 'schedule' ? true : autoPost,
          scheduled_at:
            mode === 'schedule' && scheduledAt
              ? new Date(scheduledAt).toISOString()
              : mode === 'post'
                ? new Date().toISOString()
                : scheduledAt
                  ? new Date(scheduledAt).toISOString()
                  : null,
          published_at: mode === 'post' ? new Date().toISOString() : null,
          actor: 'Ebba',
        }),
      });
      if (!r.ok) throw new Error('save failed');

      if (mode === 'post') {
        const imageUrl =
          mediaItems.find((m) => m.type === 'image' && m.url)?.url ||
          mediaItems.find((m) => m.url)?.url ||
          '';
        const publishRes = await fetch('/api/planner/publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(workspaceId
              ? {
                  'x-workspace-id': workspaceId,
                  'x-active-workspace-id': workspaceId,
                }
              : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            workspaceId,
            platforms: platforms.filter((p) => connectedPlatforms.has(p)),
            caption,
            hashtags,
            title: derivedTitle,
            imageUrl,
          }),
        });
        const publishJson = (await publishRes.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          error?: string;
          results?: Array<{ platform: string; ok: boolean; error?: string }>;
        };
        if (!publishRes.ok || !publishJson.ok) {
          const detail =
            publishJson.error ||
            publishJson.results?.find((x) => !x.ok)?.error ||
            publishJson.message ||
            'Publish failed';
          toast.error(detail);
          // Keep planner row as published attempt; don't close silently.
          onSaved();
          void queryClient.invalidateQueries({ queryKey: ['planner-campaign'] });
          return;
        }
        toast.success(publishJson.message || 'Posted to connected accounts');
      } else if (mode === 'schedule') {
        toast.success('Saved & scheduled');
      } else {
        toast.success(t('saveDraft', locale));
      }

      onSaved();
      void queryClient.invalidateQueries({ queryKey: ['planner-campaign'] });
      void queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const sendComment = async () => {
    if ((!comment.trim() && !commentImage) || sending) return;
    if (!post?.id) {
      // Local-only until post exists
      const local: PlannerComment = {
        id: `local-${Date.now()}`,
        author_id: 'u-ebba',
        author_name: 'Ebba',
        author_avatar: PLANNER_TEAM[0].avatar_url,
        text: comment.trim(),
        image_url: commentImage,
        created_at: new Date().toISOString(),
        visibility: rightTab,
      };
      setLocalComments((c) => [...c, local]);
      setComment('');
      setCommentImage(null);
      return;
    }
    setSending(true);
    try {
      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'comment',
          id: post.id,
          text: comment,
          image_url: commentImage,
          visibility: rightTab,
          author_id: 'u-ebba',
          author_name: 'Ebba',
        }),
      });
      const data = await r.json();
      if (data.comment) {
        setLocalComments((c) => [...c, data.comment]);
        if (data.post?.activity) setLocalActivity(data.post.activity);
      }
      setComment('');
      setCommentImage(null);
      onSaved();
    } finally {
      setSending(false);
    }
  };

  const filteredActivity = localActivity.filter((a) =>
    rightTab === 'public' ? a.visibility === 'public' : true
  );
  const filteredComments = localComments.filter((c) =>
    rightTab === 'public' ? c.visibility === 'public' : true
  );

  const mediaPane = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-3 pb-2 flex gap-1 flex-shrink-0">
        {(
          [
            { key: 'media' as const, label: t('studioMedia', locale) },
            { key: 'preview' as const, label: t('livePreview', locale) },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setLeftTab(key)}
            className={`flex-1 h-11 min-h-[44px] rounded-xl text-xs font-extrabold transition-colors ${
              leftTab === key
                ? 'bg-[var(--nc-coral)] text-white'
                : 'bg-zinc-50 text-zinc-500 hover:text-[#2c3340]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {leftTab === 'media' ? (
          <CarouselMediaUploader items={mediaItems} onChange={setMediaItems} />
        ) : (
          <FeedPreview
            caption={[caption, hashtags].filter(Boolean).join('\n\n') || 'Caption…'}
            mediaItems={mediaItems}
            platforms={platforms}
            username={activeBrand?.handle || '@brand'}
            displayName={activeBrand?.name || project}
            brandAvatar={activeBrand?.avatar_url}
            brandColor={activeBrand?.color}
          />
        )}
      </div>
    </div>
  );

  const detailsPane = (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
            {t('studioStatus', locale)}
          </label>
          <select
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value as WorkflowStatus)}
            className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340]"
          >
            {WORKFLOW_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {t(WORKFLOW_LABEL_KEYS[c.key], locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
            {t('teamWorkspaceBrand', locale)}
          </label>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340]"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name} ({w.handle})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
          {t('studioAssignees', locale)}
        </p>
        <div className="flex flex-wrap gap-2">
          {PLANNER_TEAM.map((a) => {
            const active = assignees.some((x) => x.id === a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAssignee(a)}
                className={`inline-flex items-center gap-1.5 h-11 min-h-[44px] pl-1.5 pr-3 rounded-full border text-xs font-extrabold transition-colors ${
                  active
                    ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)] text-[#2c3340]'
                    : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                }`}
              >
                <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                {a.name}
                {active && <Check size={12} className="text-[var(--nc-coral)]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
          {t('campaignLabels', locale)}
        </p>
        <p className="text-[11px] text-zinc-400 font-medium mb-2">
          {t('campaignLabelsHint', locale)}
        </p>

        {creatingProject ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 space-y-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-400 flex items-center gap-1.5">
              <FolderKanban size={12} />
              {t('newProject', locale)}
            </p>
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={t('projectNamePlaceholder', locale)}
              autoFocus
              className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newProjectName.trim()) {
                  e.preventDefault();
                  createProjectMutation.mutate();
                }
                if (e.key === 'Escape') {
                  setCreatingProject(false);
                  setNewProjectName('');
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewProjectColor(c)}
                  className={`w-8 h-8 min-h-[32px] rounded-full ${
                    newProjectColor === c ? 'ring-2 ring-offset-2 ring-zinc-400' : ''
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreatingProject(false);
                  setNewProjectName('');
                }}
                className="h-11 min-h-[44px] px-3 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-white"
              >
                {t('cancel', locale)}
              </button>
              <button
                type="button"
                disabled={!newProjectName.trim() || createProjectMutation.isPending}
                onClick={() => createProjectMutation.mutate()}
                className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl bg-zinc-900 text-white text-xs font-extrabold disabled:opacity-40"
              >
                {createProjectMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                {t('createProject', locale)}
              </button>
            </div>
          </div>
        ) : campaignLabels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <FolderKanban size={18} className="text-zinc-300 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-zinc-700">
                  {t('noProjectsYet', locale)}
                </p>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-snug">
                  {t('campaignLabelsHint', locale)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreatingProject(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold hover:bg-[#1a1848] transition-colors"
            >
              <Plus size={14} />
              {t('createProject', locale)}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {campaignLabels.map((c) => {
                const active = campaignIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCampaign(c.id)}
                    className={`inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-full border text-xs font-extrabold transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: active ? '#F472B6' : c.color }}
                    />
                    {c.name}
                    {active && <Check size={12} />}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCreatingProject(true)}
                className="inline-flex items-center gap-1 h-11 min-h-[44px] px-3 rounded-full border border-dashed border-zinc-200 bg-white text-xs font-extrabold text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 transition-colors"
              >
                <Plus size={12} />
                {t('createProject', locale)}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
          Target Platforms
        </p>
        <p className="text-[11px] text-zinc-400 font-medium mb-2">
          Post goes live on connected accounts for this workspace only.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_OPTIONS.map(({ key, label }) => {
            const checked = platforms.includes(key);
            const connected = connectedPlatforms.has(key);
            return (
              <label
                key={key}
                className={`flex items-center gap-2 h-11 min-h-[44px] px-3 rounded-xl border text-xs font-extrabold cursor-pointer ${
                  checked
                    ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)]'
                    : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                }`}
              >
                <Checkbox checked={checked} onCheckedChange={() => togglePlatform(key)} />
                <span className="flex-1 min-w-0 truncate">{label}</span>
                <span
                  className={`text-[9px] font-black uppercase tracking-wide ${
                    connected ? 'text-emerald-600' : 'text-zinc-300'
                  }`}
                >
                  {connected ? 'Live' : 'Off'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
            {t('studioScheduleDate', locale)}
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340]"
          />
        </div>
        <label className="flex items-center justify-between gap-3 h-11 min-h-[44px] rounded-xl border border-zinc-100 bg-zinc-50 px-3 sm:min-w-[140px]">
          <span className="text-xs font-extrabold text-[#2c3340]">Auto-Post</span>
          <Switch checked={autoPost} onCheckedChange={setAutoPost} />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            {t('studioCaption', locale)}
          </label>
          <button
            type="button"
            onClick={() => void polish()}
            disabled={polishing || !caption.trim()}
            className="h-10 min-h-[44px] px-2 rounded-lg text-[var(--nc-coral)] inline-flex items-center gap-1 text-[11px] font-extrabold disabled:opacity-40"
          >
            {polishing ? (
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={12} />
            )}
            AI Polera
          </button>
        </div>
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Skriv caption…"
          className="min-h-[100px] rounded-xl border-zinc-200 resize-none text-sm"
        />
      </div>

      <div>
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
          Hashtags
        </label>
        <Input
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#tips #creator #nordic"
          className="h-11 rounded-xl border-zinc-200 font-mono text-xs"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-between gap-2 h-11 min-h-[44px] flex-1 min-w-[180px] px-3 rounded-xl border border-zinc-200 bg-white text-xs font-extrabold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Heart size={13} className="text-[#F472B6] flex-shrink-0" />
                  <span className="truncate">
                    Favourites
                    {favoriteHashtags.length > 0
                      ? ` (${favoriteHashtags.length})`
                      : ''}
                  </span>
                </span>
                <ChevronDown size={14} className="text-zinc-400 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[min(360px,92vw)] z-[80] p-0 overflow-hidden"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-400 px-3 py-2.5">
                Saved hashtag sets
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="m-0" />
              {favoriteHashtags.length === 0 ? (
                <div className="px-3 py-4 text-[11px] text-zinc-400 font-medium leading-snug">
                  No favourites yet. Add hashtags above, then tap Save favourite.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto py-1">
                  {favoriteHashtags.map((fav) => (
                    <div
                      key={fav.id}
                      className="flex items-start gap-1 px-1.5 py-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setHashtags((prev) =>
                            mergeHashtagStrings(prev, fav.tags)
                          );
                          toast.message('Hashtags added');
                        }}
                        className="flex-1 min-w-0 text-left rounded-lg px-2 py-2 hover:bg-zinc-50 transition-colors"
                      >
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#F472B6] uppercase tracking-wide">
                          <Hash size={10} />
                          Use
                        </span>
                        <p className="font-mono text-[11px] font-semibold text-zinc-700 break-words leading-snug mt-0.5">
                          {fav.tags}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHashtags(fav.tags)}
                        className="h-9 min-h-[36px] px-2 mt-1 rounded-lg text-[10px] font-extrabold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors flex-shrink-0"
                        title="Replace field with this set"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFavoriteHashtags(
                            removeFavoriteHashtags(workspaceId, fav.id)
                          );
                        }}
                        className="h-9 w-9 min-h-[36px] min-w-[36px] mt-1 rounded-lg text-zinc-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center flex-shrink-0 transition-colors"
                        aria-label="Remove favourite"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            disabled={!normalizeHashtagString(hashtags)}
            onClick={() => {
              const saved = saveFavoriteHashtags(workspaceId, hashtags);
              if (!saved) {
                toast.message('Add hashtags first');
                return;
              }
              setFavoriteHashtags(listFavoriteHashtags(workspaceId));
              toast.success('Saved to favourites');
            }}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl border border-[#FCE7F3] bg-[#FDF2F8] text-[11px] font-extrabold text-[#F472B6] hover:bg-[#FCE7F3] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Save current hashtags to favourites"
          >
            <Star size={13} />
            Save favourite
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
          {t('studioSubtasks', locale)}
        </p>
        <div className="space-y-1.5 mb-2">
          {subtasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 h-11 min-h-[44px] px-2 rounded-xl bg-zinc-50 border border-zinc-100"
            >
              <Checkbox
                checked={task.done}
                onCheckedChange={(checked) =>
                  setSubtasks((prev) =>
                    prev.map((t) =>
                      t.id === task.id ? { ...t, done: Boolean(checked) } : t
                    )
                  )
                }
              />
              <span
                className={`flex-1 text-sm font-bold ${
                  task.done ? 'line-through text-zinc-400' : 'text-[#2c3340]'
                }`}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => setSubtasks((prev) => prev.filter((t) => t.id !== task.id))}
                className="h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTask.trim()) {
                setSubtasks((prev) => [
                  ...prev,
                  { id: nextSubtaskId(), title: newTask.trim(), done: false },
                ]);
                setNewTask('');
              }
            }}
            placeholder="Lägg till subtask…"
            className="h-11 rounded-xl border-zinc-200"
          />
          <button
            type="button"
            onClick={() => {
              if (!newTask.trim()) return;
              setSubtasks((prev) => [
                ...prev,
                { id: nextSubtaskId(), title: newTask.trim(), done: false },
              ]);
              setNewTask('');
            }}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const teamPane = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-3 pb-2 flex gap-1 flex-shrink-0">
        {(
          [
            { key: 'private' as const, label: 'Private' },
            { key: 'public' as const, label: 'Public' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setRightTab(key)}
            className={`flex-1 h-11 min-h-[44px] rounded-xl text-xs font-extrabold ${
              rightTab === key ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-4">
        <div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
            {t('studioActivityLog', locale)}
          </p>
          <ul className="space-y-2.5">
            {filteredActivity.length === 0 && (
              <li className="text-xs text-zinc-400 font-medium">Ingen aktivitet ännu.</li>
            )}
            {[...filteredActivity].reverse().map((a) => (
              <li key={a.id} className="flex gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--nc-coral)] mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-[#2c3340]">{a.text}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {formatRelative(a.created_at)}
                    {a.visibility === 'private' ? ' · private' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
            Team Chat
          </p>
          <div className="space-y-3">
            {filteredComments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <img
                  src={c.author_avatar}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1 rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-extrabold text-[#2c3340]">{c.author_name}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {formatRelative(c.created_at)}
                    </span>
                  </div>
                  {c.text && (
                    <p className="text-xs text-zinc-600 font-medium whitespace-pre-wrap">{c.text}</p>
                  )}
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt=""
                      className="mt-2 rounded-lg max-h-32 object-cover"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-zinc-100 space-y-2 flex-shrink-0 bg-white">
        <input
          ref={commentFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const result = await upload({ file });
            setCommentImage(result.url || URL.createObjectURL(file));
            e.target.value = '';
          }}
        />
        {commentImage && (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden">
            <img src={commentImage} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setCommentImage(null)}
              className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {showEmoji && (
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setComment((c) => c + e)}
                className="h-10 w-10 min-h-[40px] text-base rounded-lg hover:bg-zinc-50"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => commentFileRef.current?.click()}
            disabled={uploadingComment}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 text-zinc-500 flex items-center justify-center"
          >
            {uploadingComment ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <ImageIcon size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 text-zinc-500 flex items-center justify-center"
          >
            <Smile size={14} />
          </button>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Skriv till teamet…"
            className="flex-1 min-h-[44px] max-h-24 rounded-xl border-zinc-200 resize-none text-sm py-2.5"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendComment();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void sendComment()}
            disabled={sending || (!comment.trim() && !commentImage)}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--nc-coral)] text-white flex items-center justify-center disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden flex flex-col border-0 sm:border bg-white
          w-full max-w-none sm:max-w-[min(1200px,96vw)]
          h-[100dvh] max-h-[100dvh] sm:h-[min(880px,92vh)] sm:max-h-[92vh]
          rounded-none sm:rounded-2xl
          top-0 left-0 translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 sm:px-5 h-14 border-b border-zinc-100 flex-shrink-0">
          <DialogTitle className="sr-only">Post Studio</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="lg:hidden h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-zinc-500 hover:bg-zinc-100 flex items-center justify-center"
            aria-label="Stäng"
          >
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 truncate">
              {project}
            </p>
            <p className="text-sm font-extrabold text-[#2c3340] truncate">
              {derivedTitle || 'Nytt inlägg'}
            </p>
          </div>
          <button
            type="button"
            className="hidden sm:inline-flex h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 items-center gap-1.5"
          >
            <Share2 size={13} /> Share
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={saving || !caption.trim() || platforms.length === 0}
                className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-extrabold px-3 sm:px-4 text-xs sm:text-sm gap-1.5"
              >
                {saving ? (
                  <Loader2
                    size={14}
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                ) : (
                  <>
                    <span className="sm:hidden">Actions</span>
                    <span className="hidden sm:inline">Publish</span>
                    <ChevronDown size={14} className="opacity-90" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[80]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-400">
                Save options
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-bold"
                disabled={saving}
                onSelect={() => void save('draft')}
              >
                <FileText size={14} />
                {t('saveDraft', locale)}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-bold"
                disabled={saving || !scheduledAt}
                onSelect={() => void save('schedule')}
              >
                <CalendarClock size={14} />
                {t('schedulePost', locale)}
                {!scheduledAt ? (
                  <span className="ml-auto text-[10px] font-medium text-zinc-400">
                    set date
                  </span>
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-extrabold text-[var(--nc-coral)]"
                disabled={
                  saving ||
                  ![...platforms].some((p) => connectedPlatforms.has(p))
                }
                onSelect={() => void save('post')}
              >
                <Send size={14} />
                {t('publishNow', locale)}
              </DropdownMenuItem>
              {platforms.some((p) => !connectedPlatforms.has(p)) ? (
                <p className="px-2 py-1.5 text-[10px] text-zinc-400 font-medium leading-snug">
                  Only connected channels (Live) will be posted. Connect others
                  in Settings → Socials.
                </p>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="hidden lg:flex h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-zinc-400 hover:bg-zinc-100 items-center justify-center"
            aria-label="Stäng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile app: tabbed single pane */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            {mobilePane === 'details' && detailsPane}
            {mobilePane === 'media' && mediaPane}
            {mobilePane === 'team' && teamPane}
          </div>
          <nav className="flex-shrink-0 grid grid-cols-3 border-t border-zinc-100 bg-white pb-[env(safe-area-inset-bottom)]">
            {(
              [
                { key: 'details' as const, label: t('contentTab', locale), icon: FileText },
                { key: 'media' as const, label: t('studioMedia', locale), icon: ImageIcon },
                { key: 'team' as const, label: t('teamTab', locale), icon: MessageCircle },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMobilePane(key)}
                className={`flex flex-col items-center justify-center gap-0.5 h-14 min-h-[56px] text-[10px] font-extrabold ${
                  mobilePane === key ? 'text-[var(--nc-coral)]' : 'text-zinc-400'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Desktop web: true 3-column studio */}
        <div className="hidden lg:grid flex-1 min-h-0 grid-cols-[minmax(280px,1fr)_minmax(340px,1.15fr)_minmax(280px,0.95fr)] overflow-hidden">
          <section className="border-r border-zinc-100 min-h-0 overflow-hidden bg-zinc-50/40">
            {mediaPane}
          </section>
          <section className="border-r border-zinc-100 min-h-0 overflow-hidden">
            {detailsPane}
          </section>
          <section className="min-h-0 overflow-hidden">{teamPane}</section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
