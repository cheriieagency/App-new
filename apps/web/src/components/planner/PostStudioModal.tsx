'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  FileText,
  FolderKanban,
  Hash,
  Heart,
  ImageIcon,
  Loader2,
  Mail,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import useUpload from '@/utils/useUpload';
import {
  PLANNER_TEAM,
  PLATFORM_META,
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

const PLATFORM_OPTIONS: {
  key: SocialPlatform;
  label: string;
  Icon: typeof InstagramIcon;
}[] = [
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon },
  { key: 'youtube', label: 'YouTube', Icon: YouTubeIcon },
];

const PROJECT_COLORS = [
  '#F472B6',
  '#9089F0',
  '#10B981',
  '#F59E0B',
  '#2B2568',
  '#0EA5E9',
];

/** Soft section label — sentence case, not ALL CAPS. */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium text-slate-500 mb-1.5">{children}</p>
  );
}

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
  const [sideTab, setSideTab] = useState<'preview' | 'team'>('preview');
  const [chatVisibility, setChatVisibility] = useState<'private' | 'public'>(
    'private'
  );
  /** Mobile: one pane at a time. */
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview' | 'team'>(
    'editor'
  );
  const [showHashtagField, setShowHashtagField] = useState(false);
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
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [emailShareOpen, setEmailShareOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailNote, setEmailNote] = useState('');
  /** Tracks id after first save/share so subsequent actions update the same row. */
  const [workingPostId, setWorkingPostId] = useState<string | null>(post?.id ?? null);
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
      toast.error(t('toastCreateProjectFailed', locale));
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
      setWorkingPostId(post.id);
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
      setWorkingPostId(null);
    }
    setSideTab('preview');
    setChatVisibility('private');
    setMobilePane('editor');
    setShowHashtagField(false);
    setShareCopied(false);
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
      toast.error(t('toastPickScheduleFirst', locale));
      return;
    }

    if (mode === 'post') {
      const liveTargets = platforms.filter((p) =>
        connectedPlatforms.has(p)
      );
      if (liveTargets.length === 0) {
        toast.error(t('toastConnectIgFbSettings', locale));
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
          id: post?.id || workingPostId || undefined,
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
          workspaceId,
        }),
      });
      if (!r.ok) throw new Error('save failed');
      const savedJson = (await r.json().catch(() => ({}))) as {
        post?: { id?: string };
      };
      if (savedJson.post?.id) setWorkingPostId(savedJson.post.id);

      if (mode === 'post') {
        const primaryMedia =
          mediaItems.find((m) => m.url) ||
          mediaItems.find((m) => m.type === 'image' && m.url) ||
          null;
        const mediaUrl = primaryMedia?.url || '';
        const mediaType = primaryMedia?.type || 'image';
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
            mediaUrl,
            mediaType,
            imageUrl: mediaType === 'image' ? mediaUrl : undefined,
            videoUrl: mediaType === 'video' ? mediaUrl : undefined,
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
            t('toastPublishFailed', locale);
          toast.error(detail);
          // Keep planner row as published attempt; don't close silently.
          onSaved();
          void queryClient.invalidateQueries({ queryKey: ['planner-campaign'] });
          return;
        }
        toast.success(publishJson.message || t('toastPostedSuccess', locale));
      } else if (mode === 'schedule') {
        toast.success(t('toastSavedScheduled', locale));
      } else {
        toast.success(t('saveDraft', locale));
      }

      onSaved();
      void queryClient.invalidateQueries({ queryKey: ['planner-campaign'] });
      void queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('toastSaveFailed', locale)
      );
    } finally {
      setSaving(false);
    }
  };

  /** Shared payload for link copy + email invite. */
  const sharePayload = () => ({
    id: post?.id || workingPostId || undefined,
    title: derivedTitle,
    caption,
    hashtags,
    platforms,
    project,
    media_items: mediaItems,
    workspaceId,
  });

  const canShare =
    Boolean(caption.trim()) && platforms.length > 0 && !sharing;

  /** Create a client review link (public chat only) and copy it. */
  const copyShareLink = async () => {
    if (sharing) return;
    if (!caption.trim()) {
      toast.error('Add a caption before sharing with a client.');
      return;
    }
    if (platforms.length === 0) {
      toast.error('Select at least one platform.');
      return;
    }
    setSharing(true);
    setShareCopied(false);
    try {
      const r = await fetch('/api/planner/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'link', ...sharePayload() }),
      });
      const json = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        postId?: string;
        shareUrl?: string;
        message?: string;
        error?: string;
      };
      if (!r.ok || !json.ok || !json.shareUrl) {
        throw new Error(json.message || json.error || 'Could not create share link');
      }
      if (json.postId) setWorkingPostId(json.postId);
      try {
        await navigator.clipboard.writeText(json.shareUrl);
        setShareCopied(true);
        toast.success('Client link copied — they only see the Public chat.');
      } catch {
        toast.message(json.shareUrl);
      }
      onSaved();
      setSideTab('team');
      setChatVisibility('public');
      window.setTimeout(() => setShareCopied(false), 2500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not create share link'
      );
    } finally {
      setSharing(false);
    }
  };

  /** Email the client review link via Resend. */
  const emailShareLink = async () => {
    if (sharing) return;
    if (!caption.trim()) {
      toast.error('Add a caption before sharing with a client.');
      return;
    }
    if (!emailTo.trim()) {
      toast.error('Enter at least one client email.');
      return;
    }
    setSharing(true);
    try {
      const r = await fetch('/api/planner/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'email',
          to: emailTo,
          note: emailNote.trim() || undefined,
          ...sharePayload(),
        }),
      });
      const json = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        postId?: string;
        shareUrl?: string;
        emailed?: string[];
        message?: string;
        error?: string;
        missingEnv?: string[];
      };
      if (!r.ok || !json.ok) {
        if (json.error === 'missing_env' || r.status === 503) {
          throw new Error(
            'Email is not connected yet. Add Resend keys in Settings, or copy the link instead.'
          );
        }
        throw new Error(json.message || json.error || 'Could not send email');
      }
      if (json.postId) setWorkingPostId(json.postId);
      const count = json.emailed?.length || 1;
      toast.success(
        count === 1
          ? `Invite sent to ${json.emailed?.[0] || 'client'}`
          : `Invite sent to ${count} clients`
      );
      setEmailShareOpen(false);
      setEmailNote('');
      onSaved();
      setSideTab('team');
      setChatVisibility('public');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not send email'
      );
    } finally {
      setSharing(false);
    }
  };

  const sendComment = async () => {
    if ((!comment.trim() && !commentImage) || sending) return;
    if (!post?.id && !workingPostId) {
      // Local-only until post exists
      const local: PlannerComment = {
        id: `local-${Date.now()}`,
        author_id: 'u-ebba',
        author_name: 'Ebba',
        author_avatar: PLANNER_TEAM[0].avatar_url,
        text: comment.trim(),
        image_url: commentImage,
        created_at: new Date().toISOString(),
        visibility: chatVisibility,
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
          id: post?.id || workingPostId,
          text: comment,
          image_url: commentImage,
          visibility: chatVisibility,
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
    chatVisibility === 'public' ? a.visibility === 'public' : true
  );
  const filteredComments = localComments.filter((c) =>
    chatVisibility === 'public' ? c.visibility === 'public' : true
  );
  const hasActivity = filteredActivity.length > 0;


  const hashtagFavouritesMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#F472B6] transition-colors"
          title="Favourite hashtags"
          aria-label="Favourite hashtags"
        >
          <Hash size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(360px,92vw)] z-[80] p-0 overflow-hidden"
      >
        <DropdownMenuLabel className="text-xs font-medium text-slate-500 px-3 py-2.5">
          Saved hashtag sets
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {favoriteHashtags.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-slate-400 font-medium leading-snug">
            No favourites yet. Add hashtags, then save a favourite.
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto py-1">
            {favoriteHashtags.map((fav) => (
              <div key={fav.id} className="flex items-start gap-1 px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setHashtags((prev) => mergeHashtagStrings(prev, fav.tags));
                    setShowHashtagField(true);
                    toast.message(t('toastHashtagsAdded', locale));
                  }}
                  className="flex-1 min-w-0 text-left rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F472B6]">
                    <Hash size={10} />
                    Use
                  </span>
                  <p className="font-mono text-[11px] font-semibold text-slate-700 break-words leading-snug mt-0.5">
                    {fav.tags}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHashtags(fav.tags);
                    setShowHashtagField(true);
                  }}
                  className="h-9 min-h-[36px] px-2 mt-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
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
                  className="h-9 w-9 min-h-[36px] min-w-[36px] mt-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center flex-shrink-0 transition-colors"
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
  );

  const editorPane = (
    <div className="h-full overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
      {/* Row 1 — Target platforms */}
      <div>
        <FieldLabel>Target platforms</FieldLabel>
        <div className="flex flex-wrap items-center gap-2.5">
          {PLATFORM_OPTIONS.map(({ key, label, Icon }) => {
            const active = platforms.includes(key);
            const connected = connectedPlatforms.has(key);
            const color = PLATFORM_META[key]?.color || '#64748b';
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePlatform(key)}
                title={`${label}${connected ? ' · Live' : ' · Not connected'}`}
                aria-pressed={active}
                className={`relative inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border transition-all ${
                  active
                    ? 'border-transparent shadow-sm scale-[1.02]'
                    : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                }`}
                style={
                  active
                    ? {
                        background: `color-mix(in srgb, ${color} 14%, white)`,
                        boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 45%, transparent)`,
                        color,
                      }
                    : { color: '#64748b' }
                }
              >
                <Icon size={18} />
                {active ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#2B2568] text-white flex items-center justify-center ring-2 ring-white"
                    aria-hidden
                  >
                    <Check size={9} strokeWidth={3} />
                  </span>
                ) : null}
                {connected && !active ? (
                  <span
                    className="absolute top-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400 font-medium">
          Posts go live on connected accounts for this workspace.
        </p>
      </div>

      {/* Row 2 — Caption & AI */}
      <div>
        <FieldLabel>{t('studioCaption', locale)}</FieldLabel>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#2B2568]/10 focus-within:border-slate-300 transition-shadow">
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption…"
            className="min-h-[120px] border-0 rounded-none resize-none text-sm shadow-none focus-visible:ring-0 px-3.5 pt-3.5 pb-2"
          />
          {(showHashtagField || hashtags.trim()) && (
            <div className="px-3 pb-2">
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#tips #creator #nordic"
                className="h-9 rounded-lg border-slate-200 bg-slate-50/80 font-mono text-xs"
              />
            </div>
          )}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => void polish()}
              disabled={polishing || !caption.trim()}
              className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-2.5 rounded-lg text-[11px] font-semibold text-[#F472B6] hover:bg-[#FDF2F8] disabled:opacity-40 transition-colors"
              title="AI polish"
            >
              {polishing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              AI
            </button>
            {hashtagFavouritesMenu}
            <button
              type="button"
              onClick={() => setShowHashtagField((v) => !v)}
              className={`inline-flex items-center justify-center h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg transition-colors ${
                showHashtagField || hashtags.trim()
                  ? 'text-[#F472B6] bg-[#FDF2F8]'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Hashtags"
              aria-label="Hashtags"
            >
              <Heart size={14} />
            </button>
            <button
              type="button"
              disabled={!normalizeHashtagString(hashtags)}
              onClick={() => {
                const saved = saveFavoriteHashtags(workspaceId, hashtags);
                if (!saved) {
                  toast.message(t('toastAddHashtagsFirst', locale));
                  return;
                }
                setFavoriteHashtags(listFavoriteHashtags(workspaceId));
                toast.success(t('toastSavedToFavourites', locale));
              }}
              className="inline-flex items-center justify-center h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg text-slate-500 hover:bg-slate-100 hover:text-amber-500 disabled:opacity-40 transition-colors"
              title="Save favourite hashtags"
              aria-label="Save favourite"
            >
              <Star size={14} />
            </button>
            <span className="ml-auto pr-2 text-[10px] font-medium text-slate-400 tabular-nums">
              {caption.length}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3 — Media */}
      <CarouselMediaUploader
        items={mediaItems}
        onChange={setMediaItems}
        compact
      />

      {/* Row 4 — Schedule & status */}
      <div>
        <FieldLabel>Schedule & status</FieldLabel>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:items-center">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="flex-1 min-w-[180px] h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
          />
          <label className="inline-flex items-center justify-between gap-3 h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 sm:min-w-[148px]">
            <span className="text-xs font-semibold text-slate-700">Auto-Post</span>
            <Switch checked={autoPost} onCheckedChange={setAutoPost} />
          </label>
          <select
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value as WorkflowStatus)}
            className="h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 sm:min-w-[160px]"
            aria-label={t('studioStatus', locale)}
          >
            {WORKFLOW_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {t(WORKFLOW_LABEL_KEYS[c.key], locale)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced — subtasks, projects, favourites extras */}
      <Accordion type="single" collapsible className="rounded-xl border border-slate-200 px-3.5">
        <AccordionItem value="advanced" className="border-0">
          <AccordionTrigger className="py-3.5 text-sm font-semibold text-slate-700 hover:no-underline">
            Advanced settings
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-5">
            <div>
              <FieldLabel>{t('teamWorkspaceBrand', locale)}</FieldLabel>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({w.handle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>{t('studioAssignees', locale)}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {PLANNER_TEAM.map((a) => {
                  const active = assignees.some((x) => x.id === a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAssignee(a)}
                      className={`inline-flex items-center gap-1.5 h-11 min-h-[44px] pl-1.5 pr-3 rounded-full border text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#F472B6] bg-[#FDF2F8] text-slate-800'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      <img
                        src={a.avatar_url}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      {a.name}
                      {active && <Check size={12} className="text-[#F472B6]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel>{t('campaignLabels', locale)}</FieldLabel>
              <p className="text-[11px] text-slate-400 font-medium mb-2 -mt-1">
                {t('campaignLabelsHint', locale)}
              </p>
              {creatingProject ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <FolderKanban size={12} />
                    {t('newProject', locale)}
                  </p>
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={t('projectNamePlaceholder', locale)}
                    autoFocus
                    className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
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
                          newProjectColor === c
                            ? 'ring-2 ring-offset-2 ring-slate-400'
                            : ''
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
                      className="h-11 min-h-[44px] px-3 rounded-xl text-xs font-semibold text-slate-500 hover:bg-white"
                    >
                      {t('cancel', locale)}
                    </button>
                    <button
                      type="button"
                      disabled={
                        !newProjectName.trim() || createProjectMutation.isPending
                      }
                      onClick={() => createProjectMutation.mutate()}
                      className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-40"
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
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <FolderKanban
                      size={18}
                      className="text-slate-300 mt-0.5 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">
                        {t('noProjectsYet', locale)}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">
                        {t('campaignLabelsHint', locale)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreatingProject(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl bg-[#2B2568] text-white text-xs font-semibold hover:bg-[#1a1848] transition-colors"
                  >
                    <Plus size={14} />
                    {t('createProject', locale)}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {campaignLabels.map((c) => {
                    const active = campaignIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCampaign(c.id)}
                        className={`inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-full border text-xs font-semibold transition-colors ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
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
                    className="inline-flex items-center gap-1 h-11 min-h-[44px] px-3 rounded-full border border-dashed border-slate-200 bg-white text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors"
                  >
                    <Plus size={12} />
                    {t('createProject', locale)}
                  </button>
                </div>
              )}
            </div>

            <div>
              <FieldLabel>{t('studioSubtasks', locale)}</FieldLabel>
              <div className="space-y-1.5 mb-2">
                {subtasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 h-11 min-h-[44px] px-2 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={(checked) =>
                        setSubtasks((prev) =>
                          prev.map((t) =>
                            t.id === task.id
                              ? { ...t, done: Boolean(checked) }
                              : t
                          )
                        )
                      }
                    />
                    <span
                      className={`flex-1 text-sm font-semibold ${
                        task.done
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {task.title}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSubtasks((prev) =>
                          prev.filter((t) => t.id !== task.id)
                        )
                      }
                      className="h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-red-500"
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
                        {
                          id: nextSubtaskId(),
                          title: newTask.trim(),
                          done: false,
                        },
                      ]);
                      setNewTask('');
                    }
                  }}
                  placeholder="Add a subtask…"
                  className="h-11 rounded-xl border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTask.trim()) return;
                    setSubtasks((prev) => [
                      ...prev,
                      {
                        id: nextSubtaskId(),
                        title: newTask.trim(),
                        done: false,
                      },
                    ]);
                    setNewTask('');
                  }}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  const teamContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-3 pb-2 flex gap-1 flex-shrink-0">
        {(
          [
            { key: 'private' as const, label: 'Private' },
            { key: 'public' as const, label: 'Public' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setChatVisibility(key)}
            className={`flex-1 h-10 min-h-[40px] rounded-xl text-xs font-semibold transition-colors ${
              chatVisibility === key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="px-4 pb-1 text-[11px] text-slate-400 font-medium">
        {chatVisibility === 'public'
          ? 'Clients with your share link can see this chat.'
          : 'Only your team sees Private messages.'}
      </p>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-4">
        {hasActivity ? (
          <div>
            <FieldLabel>{t('studioActivityLog', locale)}</FieldLabel>
            <ul className="space-y-2.5">
              {[...filteredActivity].reverse().map((a) => (
                <li key={a.id} className="flex gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F472B6] mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{a.text}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatRelative(a.created_at)}
                      {a.visibility === 'private' ? ' · private' : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <FieldLabel>Team chat</FieldLabel>
          <div className="space-y-3">
            {filteredComments.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-2">
                No messages yet — leave a note for your team.
              </p>
            ) : null}
            {filteredComments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <img
                  src={c.author_avatar}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-800">
                      {c.author_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatRelative(c.created_at)}
                    </span>
                  </div>
                  {c.text && (
                    <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">
                      {c.text}
                    </p>
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

      <div className="p-3 border-t border-slate-100 space-y-2 flex-shrink-0 bg-white">
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
                className="h-10 w-10 min-h-[40px] text-base rounded-lg hover:bg-slate-50"
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
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center"
          >
            {uploadingComment ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center"
          >
            <Smile size={14} />
          </button>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Message the team…"
            className="flex-1 min-h-[44px] max-h-24 rounded-xl border-slate-200 resize-none text-sm py-2.5"
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
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-[#F472B6] text-white flex items-center justify-center disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  const sidePane = (
    <div className="flex flex-col h-full min-h-0 bg-slate-50/40">
      <div className="px-3 pt-3 pb-2 flex gap-1 flex-shrink-0">
        {(
          [
            { key: 'preview' as const, label: t('livePreview', locale) },
            { key: 'team' as const, label: 'Team & Activity' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSideTab(key)}
            className={`flex-1 h-10 min-h-[40px] rounded-xl text-xs font-semibold transition-colors ${
              sideTab === key
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'bg-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {sideTab === 'preview' ? (
          <div className="h-full overflow-y-auto px-3 pb-4">
            <FeedPreview
              caption={
                [caption, hashtags].filter(Boolean).join('\n\n') || 'Caption…'
              }
              mediaItems={mediaItems}
              platforms={platforms}
              username={activeBrand?.handle || '@brand'}
              displayName={activeBrand?.name || project}
              brandAvatar={activeBrand?.avatar_url}
              brandColor={activeBrand?.color}
            />
          </div>
        ) : (
          teamContent
        )}
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden flex flex-col border-0 sm:border border-slate-200/80 bg-white
          w-full max-w-none sm:max-w-[min(1200px,96vw)]
          h-[100dvh] max-h-[100dvh] sm:h-[min(880px,92vh)] sm:max-h-[92vh]
          rounded-none sm:rounded-2xl
          top-0 left-0 translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 sm:px-5 h-14 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="sr-only">Post Studio</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="lg:hidden h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-400 truncate">{project}</p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {derivedTitle || t('newPostDefault', locale)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!canShare && !shareCopied}
                className="hidden sm:inline-flex h-11 min-h-[44px] px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 items-center gap-1.5 disabled:opacity-40 transition-colors"
                title="Share with a client"
              >
                {sharing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : shareCopied ? (
                  <Check size={13} className="text-emerald-600" />
                ) : (
                  <Share2 size={13} />
                )}
                {shareCopied ? 'Copied' : 'Share'}
                <ChevronDown size={12} className="opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[80]">
              <DropdownMenuLabel className="text-xs font-medium text-slate-500">
                Share with client
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-semibold"
                disabled={sharing || !caption.trim() || platforms.length === 0}
                onSelect={() => void copyShareLink()}
              >
                <Copy size={14} />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-semibold"
                disabled={sharing || !caption.trim() || platforms.length === 0}
                onSelect={() => {
                  setEmailShareOpen(true);
                }}
              >
                <Mail size={14} />
                Email client…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-[10px] text-slate-400 font-medium leading-snug">
                Clients only see the Public chat on the shared page.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={saving || !caption.trim() || platforms.length === 0}
                className="h-11 min-h-[44px] rounded-xl bg-[#F472B6] hover:opacity-90 text-white font-semibold px-3 sm:px-4 text-xs sm:text-sm gap-1.5"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
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
              <DropdownMenuLabel className="text-xs font-medium text-slate-500">
                Save options
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-semibold"
                disabled={saving}
                onSelect={() => void save('draft')}
              >
                <FileText size={14} />
                {t('saveDraft', locale)}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-semibold"
                disabled={saving || !scheduledAt}
                onSelect={() => void save('schedule')}
              >
                <CalendarClock size={14} />
                {t('schedulePost', locale)}
                {!scheduledAt ? (
                  <span className="ml-auto text-[10px] font-medium text-slate-400">
                    set date
                  </span>
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="h-11 min-h-[44px] gap-2 cursor-pointer font-semibold text-[#F472B6]"
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
                <p className="px-2 py-1.5 text-[10px] text-slate-400 font-medium leading-snug">
                  Only connected channels will be posted. Connect others in
                  Settings → Socials.
                </p>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="hidden lg:flex h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:bg-slate-100 items-center justify-center"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile: tabbed panes */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            {mobilePane === 'editor' && editorPane}
            {mobilePane === 'preview' && (
              <div className="h-full overflow-y-auto px-3 py-3 bg-slate-50/40">
                <FeedPreview
                  caption={
                    [caption, hashtags].filter(Boolean).join('\n\n') ||
                    'Caption…'
                  }
                  mediaItems={mediaItems}
                  platforms={platforms}
                  username={activeBrand?.handle || '@brand'}
                  displayName={activeBrand?.name || project}
                  brandAvatar={activeBrand?.avatar_url}
                  brandColor={activeBrand?.color}
                />
              </div>
            )}
            {mobilePane === 'team' && teamContent}
          </div>
          <nav className="flex-shrink-0 grid grid-cols-3 border-t border-slate-100 bg-white pb-[env(safe-area-inset-bottom)]">
            {(
              [
                {
                  key: 'editor' as const,
                  label: t('contentTab', locale),
                  icon: FileText,
                },
                {
                  key: 'preview' as const,
                  label: t('livePreview', locale),
                  icon: ImageIcon,
                },
                {
                  key: 'team' as const,
                  label: t('teamTab', locale),
                  icon: MessageCircle,
                },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMobilePane(key)}
                className={`flex flex-col items-center justify-center gap-0.5 h-14 min-h-[56px] text-[10px] font-semibold ${
                  mobilePane === key ? 'text-[#F472B6]' : 'text-slate-400'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Desktop: 60 / 40 editor + preview/team */}
        <div className="hidden lg:grid flex-1 min-h-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] overflow-hidden">
          <section className="border-r border-slate-100 min-h-0 overflow-hidden">
            {editorPane}
          </section>
          <section className="min-h-0 overflow-hidden">{sidePane}</section>
        </div>
      </DialogContent>
    </Dialog>

      {/* Email client invite — sibling dialog so Studio stays open underneath */}
      <Dialog
        open={emailShareOpen}
        onOpenChange={(open) => {
          if (!sharing) setEmailShareOpen(open);
        }}
      >
        <DialogContent className="max-w-[min(420px,94vw)] rounded-2xl border-slate-200 z-[90]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Email client
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Sends a review link via your Resend email connection. The client
              only sees the Public chat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label
                htmlFor="post-share-email"
                className="block text-xs font-medium text-slate-500 mb-1.5"
              >
                Client email
              </label>
              <Input
                id="post-share-email"
                type="email"
                autoFocus
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="client@brand.com"
                className="h-11 min-h-[44px] rounded-xl border-slate-200 text-sm"
                disabled={sharing}
              />
              <p className="mt-1 text-[11px] text-slate-400 font-medium">
                Separate multiple addresses with commas.
              </p>
            </div>
            <div>
              <label
                htmlFor="post-share-note"
                className="block text-xs font-medium text-slate-500 mb-1.5"
              >
                Note (optional)
              </label>
              <Textarea
                id="post-share-note"
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                placeholder="Quick context for your client…"
                className="min-h-[72px] rounded-xl border-slate-200 text-sm resize-none"
                disabled={sharing}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setEmailShareOpen(false)}
              disabled={sharing}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void emailShareLink()}
              disabled={sharing || !emailTo.trim() || !caption.trim()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-semibold hover:bg-[#1e1b4b] disabled:opacity-50"
            >
              {sharing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Mail size={14} />
              )}
              Send invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
