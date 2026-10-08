'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark,
  CalendarClock,
  Check,
  ChevronDown,
  Circle,
  Copy,
  FileText,
  Hash,
  ImageIcon,
  Info,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import InfoTooltip from '@/components/ui/InfoTooltip';
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
import MediaEditorModal from '@/components/planner/MediaEditorModal';
import { type PlatformHandles } from '@/components/planner/FeedPreview';
import {
  defaultMediaAspect,
  isMediaAspectRatio,
  mediaAspectChoices,
  mediaAspectTailwind,
  type ContentFormat,
  type MediaAspectRatio,
} from '@/lib/planner/media-aspect';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
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
import { isPlatformImportedPost } from '@/lib/planner/platform-posts';
import { usePendingApiPlatformAccess } from '@/hooks/usePendingApiPlatformAccess';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import {
  listFavoriteHashtags,
  mergeHashtagStrings,
  normalizeHashtagString,
  removeFavoriteHashtags,
  saveFavoriteHashtags,
  type FavoriteHashtagSet,
} from '@/lib/planner/favorite-hashtags';
import {
  parsePublishMode,
  type PublishMode,
} from '@/lib/planner/publish-modes';
import {
  MoreOptionsSection,
  type MoreOptionsValue,
} from '@/components/planner/MoreOptionsSection';

const EMPTY_MORE_OPTIONS: MoreOptionsValue = {
  collaborators: [],
  firstComment: '',
  locationName: '',
  locationId: '',
  linkInBioUrl: '',
  postTags: [],
  campaignTag: '',
};

const WORKFLOW_LABEL_KEYS: Record<WorkflowStatus, TranslationKey> = {
  IDEA: 'workflowIdeas',
  IN_PROGRESS: 'workflowInProduction',
  READY: 'workflowReview',
  SCHEDULED: 'workflowScheduled',
  PUBLISHED: 'workflowPublished',
  FAILED: 'workflowFailed',
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
  { key: 'pinterest', label: 'Pinterest', Icon: PinterestIcon },
];

const PROJECT_COLORS = [
  '#F472B6',
  '#9089F0',
  '#10B981',
  '#F59E0B',
  '#2B2568',
  '#0EA5E9',
];

/** Post Details–style field label (uppercase, tracked). */
function FieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={
        className
          ? `text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D] ${className}`
          : 'text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D] mb-1'
      }
    >
      {children}
    </p>
  );
}

/** Single cohesive segmented control — one shared border, no separate buttons. */
const SEGMENT_ROW =
  'inline-flex flex-nowrap items-stretch max-w-full overflow-x-auto scrollbar-none border border-[#E6E3DB] rounded-sm bg-white';
const SEGMENT_BTN =
  'inline-flex items-center justify-center h-8 min-h-[32px] px-2 sm:px-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors whitespace-nowrap border-0 border-r border-[#E6E3DB] last:border-r-0 rounded-none flex-shrink-0';
const SEGMENT_ON = 'bg-[#1C1917] text-white';
const SEGMENT_OFF = 'bg-transparent text-[#5C574F] hover:bg-[#F0EFEA] hover:text-[#2C2621]';
const OUTLINE_BTN =
  'inline-flex items-center justify-center h-8 min-h-[32px] px-2.5 border border-[#1C1917] bg-white text-[9px] font-semibold uppercase tracking-[0.1em] text-[#1C1917] hover:bg-[#F5F4F0] transition-colors';
const UNDERLINE_INPUT =
  'w-full h-9 min-h-[36px] bg-transparent border-0 border-b border-[#E6E3DB] rounded-none px-0 text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621]';

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
  onDeleted,
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
  /** Called after an existing draft/post is deleted. */
  onDeleted?: () => void;
}) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const workspaceCtx = useWorkspaceOptional();
  const { canAccessPlatform } = usePendingApiPlatformAccess();
  const workspaceId =
    workspaceCtx?.activeWorkspaceId?.trim() ||
    workspaceCtx?.activeWorkspace?.id?.trim() ||
    '';
  const { data: socialsData } = useSocialAccounts(open);
  const visiblePlatformOptions = useMemo(
    () => PLATFORM_OPTIONS.filter((opt) => canAccessPlatform(opt.key)),
    [canAccessPlatform]
  );
  const connectedPlatforms = useMemo(() => {
    const set = new Set<SocialPlatform>();
    for (const a of socialsData?.accounts || []) {
      if (a.connected) set.add(a.platform as SocialPlatform);
    }
    // TikTok Business maps to the same publish surface as TikTok.
    if (
      (socialsData?.accounts || []).some(
        (a) => a.connected && a.platform === 'tiktok_business'
      )
    ) {
      set.add('tiktok');
    }
    return set;
  }, [socialsData?.accounts]);

  const platformHandles = useMemo<PlatformHandles>(() => {
    const map: PlatformHandles = {};
    for (const a of socialsData?.accounts || []) {
      if (a.connected && a.handle) map[a.platform as keyof PlatformHandles] = a.handle;
    }
    return map;
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
  const [assignees, setAssignees] = useState<PlannerAssignee[]>([]);
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<PlannerSubtask[]>([]);
  const [mediaItems, setMediaItems] = useState<PlannerMediaItem[]>([]);
  const [mediaAspect, setMediaAspect] = useState<MediaAspectRatio>('4:5');
  const [contentFormat, setContentFormat] = useState<ContentFormat>('post');
  const [placeOnGrid, setPlaceOnGrid] = useState(true);
  const [internalNotes, setInternalNotes] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const mediaReplaceRef = useRef<HTMLInputElement>(null);
  const [mediaEditorOpen, setMediaEditorOpen] = useState(false);
  /** TikTok-only: upload to TikTok drafts so you can add a trending sound in the app. */
  const [tiktokTrendingSound, setTiktokTrendingSound] = useState(false);
  const [trendingSoundNote, setTrendingSoundNote] = useState('');
  const tiktokSelected = platforms.includes('tiktok');
  const publishMode: PublishMode =
    tiktokSelected && tiktokTrendingSound ? 'tiktok_draft' : 'auto_publish';
  const hasTikTokVideo = mediaItems.some(
    (m) => Boolean(m.url) && m.type === 'video'
  );
  const [moreOptions, setMoreOptions] =
    useState<MoreOptionsValue>(EMPTY_MORE_OPTIONS);
  const [newTask, setNewTask] = useState('');
  const [comment, setComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      setMoreOptions((prev) => ({
        ...prev,
        campaignTag: data.campaign.name,
      }));
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
      setAssignees(post.assignees);
      setCampaignIds(post.campaigns ?? []);
      setSubtasks(post.subtasks);
      setMediaItems(post.media_items ?? []);
      setMediaAspect(
        isMediaAspectRatio(post.media_aspect)
          ? post.media_aspect
          : defaultMediaAspect(post.platforms)
      );
      {
        const items = post.media_items ?? [];
        if (items.length > 1) setContentFormat('carousel');
        else if (post.media_aspect === '9:16' || post.media_type === 'video')
          setContentFormat('reel');
        else setContentFormat('post');
      }
      setPlaceOnGrid(true);
      setInternalNotes(post.internal_notes || '');
      setClientNotes(post.client_notes || '');
      {
        const mode = parsePublishMode(post.publish_mode);
        setTiktokTrendingSound(
          mode === 'tiktok_draft' || mode === 'notification_reminder'
        );
        setTrendingSoundNote(post.trending_sound_note || '');
      }
      setMoreOptions({
        collaborators: post.collaborators ?? [],
        firstComment: post.first_comment || '',
        locationName: post.location_name || '',
        locationId: post.location_id || '',
        linkInBioUrl: post.link_in_bio_url || '',
        postTags: post.post_tags ?? [],
        campaignTag: post.campaign_tag || '',
      });
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
      setAssignees([PLANNER_TEAM[0]]);
      setCampaignIds(defaultCampaignIds?.length ? [...defaultCampaignIds] : []);
      setSubtasks([]);
      setMediaItems([]);
      setMediaAspect('4:5');
      setContentFormat('post');
      setPlaceOnGrid(true);
      setInternalNotes('');
      setClientNotes('');
      setTiktokTrendingSound(false);
      setTrendingSoundNote('');
      setMoreOptions(EMPTY_MORE_OPTIONS);
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

  // Keep frame size valid when platforms / media / format change
  useEffect(() => {
    const choices = mediaAspectChoices(platforms, mediaItems, contentFormat);
    if (!choices.includes(mediaAspect) && choices[0]) {
      setMediaAspect(choices[0]);
    }
  }, [platforms, mediaItems, mediaAspect, contentFormat]);

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


  const canDeletePost = Boolean(post?.id) && !isPlatformImportedPost(post!);

  const deletePost = async () => {
    if (!post?.id || deleting || isPlatformImportedPost(post)) return;
    if (!window.confirm(t('confirmDeletePost', locale))) return;
    setDeleting(true);
    try {
      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: post.id }),
      });
      if (!r.ok) throw new Error('delete failed');
      const json = (await r.json()) as { ok?: boolean };
      if (json.ok === false) throw new Error('delete failed');
      toast.success(t('toastPostDeleted', locale));
      onDeleted?.();
      onOpenChange(false);
    } catch {
      toast.error('Could not delete post. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const save = async (
    mode: 'draft' | 'schedule' | 'post',
    opts?: { workflowOverride?: WorkflowStatus }
  ) => {
    if (saving) return;
    if (platforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    if (!caption.trim()) {
      toast.error(t('toastCaptionRequired', locale));
      return;
    }

    const tiktokSelected = platforms.includes('tiktok');
    const hasMedia = mediaItems.some((m) => Boolean(m.url));
    const hasTikTokVideo = mediaItems.some(
      (m) => Boolean(m.url) && m.type === 'video'
    );
    if (tiktokSelected && (mode === 'post' || mode === 'schedule') && !hasMedia) {
      toast.error(t('toastTikTokNeedsMedia', locale));
      return;
    }
    if (
      publishMode === 'tiktok_draft' &&
      (mode === 'post' || mode === 'schedule')
    ) {
      if (!connectedPlatforms.has('tiktok')) {
        toast.error('Connect TikTok under Settings → Socials to save a draft.');
        return;
      }
      if (!hasTikTokVideo) {
        toast.error(
          'TikTok drafts need a video. Add a video to finish with a trending sound in the app.'
        );
        return;
      }
    }

    if (mode === 'schedule' && !scheduledAt) {
      toast.error(t('toastPickScheduleFirst', locale));
      return;
    }

    if (mode === 'post') {
      const liveTargets = platforms.filter((p) => connectedPlatforms.has(p));
      if (liveTargets.length === 0) {
        toast.error(t('toastConnectSocialSettings', locale));
        return;
      }
    }

    if (mode === 'schedule') {
      const liveTargets = platforms.filter((p) => connectedPlatforms.has(p));
      if (liveTargets.length === 0) {
        toast.error(t('toastConnectSocialSettings', locale));
        return;
      }
      if (!workspaceId) {
        toast.error('Select a workspace before scheduling auto-post.');
        return;
      }
      if (liveTargets.length < platforms.length) {
        toast.message(
          `Will auto-post to: ${liveTargets.join(', ')}. Disconnect platforms stay selected but won't publish.`
        );
      }
    }

    if (mode === 'post' && !workspaceId) {
      toast.error('Select a workspace before publishing.');
      return;
    }

    setSaving(true);
    try {
      // Draft keeps the status pill (or an explicit override e.g. Send to approval).
      const nextWorkflow: WorkflowStatus =
        opts?.workflowOverride ??
        (mode === 'post'
          ? 'READY'
          : mode === 'schedule'
            ? 'SCHEDULED'
            : workflow);

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
            mode === 'schedule'
              ? 'scheduled'
              : 'draft',
          project,
          campaigns: campaignIds,
          assignees,
          subtasks,
          media_items: mediaItems,
          media_url: mediaItems.find((m) => m.url)?.url || null,
          media_type: mediaItems.find((m) => m.url)?.type || null,
          media_urls: mediaItems.map((m) => m.url).filter(Boolean),
          media_aspect: mediaAspect,
          publish_mode: publishMode,
          trending_sound_note:
            publishMode === 'tiktok_draft'
              ? trendingSoundNote.trim() || null
              : null,
          internal_notes: internalNotes.trim() || null,
          client_notes: clientNotes.trim() || null,
          collaborators: moreOptions.collaborators,
          first_comment: moreOptions.firstComment.trim() || null,
          location_name: moreOptions.locationName.trim() || null,
          location_id: moreOptions.locationId.trim() || null,
          link_in_bio_url: moreOptions.linkInBioUrl.trim() || null,
          post_tags: moreOptions.postTags,
          campaign_tag: moreOptions.campaignTag.trim() || null,
          auto_post: mode === 'schedule',
          scheduled_at:
            mode === 'schedule' && scheduledAt
              ? new Date(scheduledAt).toISOString()
              : scheduledAt
                ? new Date(scheduledAt).toISOString()
                : null,
          published_at: null,
          actor: 'Ebba',
          workspaceId,
        }),
      });
      if (!r.ok) throw new Error('save failed');
      const savedJson = (await r.json().catch(() => ({}))) as {
        post?: { id?: string };
      };
      if (savedJson.post?.id) setWorkingPostId(savedJson.post.id);
      const postId = savedJson.post?.id || post?.id || workingPostId || undefined;

      if (mode === 'post') {
        const primaryMedia =
          mediaItems.find((m) => m.url) ||
          mediaItems.find((m) => m.type === 'image' && m.url) ||
          null;
        const mediaUrl = primaryMedia?.url || '';
        const mediaType = primaryMedia?.type || 'image';
        const extraImageUrls = mediaItems
          .filter((m) => m.url && m.type !== 'video' && m.url !== mediaUrl)
          .map((m) => m.url);
        const mediaUrls = mediaItems.map((m) => m.url).filter(Boolean);

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
            postId,
            workspaceId,
            platforms: platforms.filter((p) => connectedPlatforms.has(p)),
            caption,
            hashtags,
            title: derivedTitle,
            mediaUrl,
            mediaType,
            mediaUrls,
            extraImageUrls,
            publishMode,
            trendingSoundNote:
              publishMode === 'tiktok_draft'
                ? trendingSoundNote.trim() || undefined
                : undefined,
            collaborators: moreOptions.collaborators,
            firstComment: moreOptions.firstComment.trim() || undefined,
            locationName: moreOptions.locationName.trim() || undefined,
            locationId: moreOptions.locationId.trim() || undefined,
            linkInBioUrl: moreOptions.linkInBioUrl.trim() || undefined,
            postTags: moreOptions.postTags,
            campaignTag: moreOptions.campaignTag.trim() || undefined,
            imageUrl: mediaType === 'image' ? mediaUrl : undefined,
            videoUrl: mediaType === 'video' ? mediaUrl : undefined,
          }),
        });
        const publishJson = (await publishRes.json().catch(() => ({}))) as {
          ok?: boolean;
          partial?: boolean;
          message?: string;
          error?: string;
          error_log?: string;
          results?: Array<{ platform: string; ok: boolean; error?: string }>;
          reminder?: {
            deepLinks?: { instagram?: string; tiktok?: string };
            caption?: string;
            mediaUrls?: string[];
            trendingSoundNote?: string | null;
          };
        };
        if (!publishRes.ok || !publishJson.ok) {
          const results = publishJson.results ?? [];
          const tiktokFail = results.find(
            (x) => x.platform === 'tiktok' && !x.ok
          );
          const otherFails = results.filter((x) => !x.ok && x.platform !== 'tiktok');
          const detail =
            tiktokFail?.error ||
            otherFails
              .map((x) => `${x.platform}: ${x.error}`)
              .join('\n') ||
            publishJson.error ||
            publishJson.message ||
            t('toastPublishFailed', locale);
          toast.error(detail);
          onSaved();
          void queryClient.invalidateQueries({ queryKey: ['planner-campaign'] });
          return;
        }
        if (publishJson.partial) {
          toast.message(
            publishJson.message ||
              'Published to some platforms — check failed accounts in Settings → Socials.'
          );
        } else if (publishMode === 'tiktok_draft') {
          const note = trendingSoundNote.trim();
          toast.success(
            publishJson.message ||
              (note
                ? `Saved to TikTok drafts. Open TikTok and add “${note}” before posting.`
                : 'Saved to TikTok drafts / inbox. Open the TikTok app to add your trending sound and post.')
          );
        } else {
          toast.success(publishJson.message || t('toastPostedSuccess', locale));
        }
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
          className="inline-flex items-center justify-center h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Saved hashtag sets"
          aria-label="Saved hashtag sets"
        >
          <Bookmark size={14} />
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
            No favourites yet. Add hashtags, then tap the star to save.
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700">
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

  const aspectOptions = mediaAspectChoices(
    platforms,
    mediaItems,
    contentFormat
  );
  const activeAspect = aspectOptions.includes(mediaAspect)
    ? mediaAspect
    : aspectOptions[0] ?? mediaAspect;
  const previewAspectClass = mediaAspectTailwind(activeAspect);
  const primaryMedia = mediaItems.find((m) => Boolean(m.url)) ?? null;
  const scheduleDate = scheduledAt.slice(0, 10);
  const scheduleTime = scheduledAt.includes('T') ? scheduledAt.slice(11, 16) : '';
  const timezoneLabel = (() => {
    try {
      return (
        Intl.DateTimeFormat(undefined, { timeZoneName: 'long' })
          .formatToParts(new Date())
          .find((p) => p.type === 'timeZoneName')?.value ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
    } catch {
      return 'Local time';
    }
  })();

  const applyScheduleParts = (date: string, time: string) => {
    if (!date) {
      setScheduledAt('');
      return;
    }
    setScheduledAt(`${date}T${time || '10:00'}`);
  };

  const applyFormat = (format: ContentFormat) => {
    setContentFormat(format);
    // Preview + ratio chips follow format immediately.
    if (format === 'reel' || format === 'story') {
      setMediaAspect('9:16');
    } else if (format === 'carousel' || format === 'post') {
      setMediaAspect((prev) =>
        prev === '9:16' ? '4:5' : isMediaAspectRatio(prev) ? prev : '4:5'
      );
    }
  };

  const STATUS_PILLS: { key: WorkflowStatus; label: string }[] = [
    { key: 'IDEA', label: 'Draft' },
    { key: 'READY', label: 'In approval queue' },
    { key: 'IN_PROGRESS', label: 'Needs editing' },
    { key: 'SCHEDULED', label: 'Scheduled' },
    { key: 'PUBLISHED', label: 'Published' },
  ];

  const mediaColumn = (
    <div className="h-full overflow-y-auto px-3 sm:px-4 py-3 space-y-3 bg-white text-xs">
      <div className="w-full max-w-[380px] mx-auto flex flex-col items-center">
        {/* Preview frame follows Format + Ratio */}
        <div
          className={`relative w-full max-h-[min(520px,58vh)] border border-[#E6E3DB] bg-[#FAFAFA] overflow-hidden transition-[aspect-ratio] duration-200 ease-out ${previewAspectClass} ${
            activeAspect === '9:16' ? 'max-w-[260px]' : 'max-w-full'
          }`}
        >
          {primaryMedia ? (
            primaryMedia.type === 'video' ? (
              <video
                src={primaryMedia.url}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryMedia.url}
                alt=""
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#C4BFB6]">
              <ImageIcon size={28} strokeWidth={1.25} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                Empty
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 w-full">
          <button
            type="button"
            disabled={!primaryMedia?.url}
            onClick={() => {
              if (!primaryMedia?.url) return;
              const a = document.createElement('a');
              a.href = primaryMedia.url;
              a.download = 'post-media';
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              a.click();
            }}
            className={`${OUTLINE_BTN} disabled:opacity-40`}
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => mediaReplaceRef.current?.click()}
            className={OUTLINE_BTN}
          >
            Replace
          </button>
          <input
            ref={mediaReplaceRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const result = await upload({ file });
              if (!result?.url) {
                toast.error('Upload failed');
                return;
              }
              const item: PlannerMediaItem = {
                id: `media-${Date.now()}`,
                url: result.url,
                type: file.type.startsWith('video/') ? 'video' : 'image',
              };
              setMediaItems((prev) =>
                prev.length ? [item, ...prev.slice(1)] : [item]
              );
            }}
          />
          <div className="flex-1" />
          <button
            type="button"
            disabled={!primaryMedia?.url}
            onClick={() => setMediaEditorOpen(true)}
            className={`${OUTLINE_BTN} disabled:opacity-40`}
          >
            Edit
          </button>
        </div>

        {platforms.includes('instagram') &&
        activeAspect === '9:16' &&
        contentFormat !== 'reel' &&
        contentFormat !== 'story' ? (
          <div className="mt-3 space-y-2 w-full">
            <p className="text-[11px] text-[#8A857D] leading-snug">
              Vertical 9:16 works for Reels & Stories. Instagram feed posts
              usually need 4:5, 3:4, 1:1, or 1.91:1 before scheduling.
            </p>
            <button
              type="button"
              onClick={() => {
                setContentFormat('post');
                setMediaAspect('4:5');
              }}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2C2621] underline underline-offset-2"
            >
              Crop to 4:5, 3:4, 1:1, or 1.91:1
            </button>
          </div>
        ) : null}

        <div className="mt-4 w-full">
          <CarouselMediaUploader
            items={mediaItems}
            onChange={setMediaItems}
            compact
            aspectLabel={activeAspect}
          />
        </div>

        <MediaEditorModal
          open={mediaEditorOpen}
          items={mediaItems}
          initialIndex={0}
          onClose={() => setMediaEditorOpen(false)}
          onSave={(next) => {
            setMediaItems(next);
            setMediaEditorOpen(false);
          }}
        />
      </div>
    </div>
  );

  const editorPane = (
    <div className="h-full overflow-y-auto px-4 sm:px-5 py-3 space-y-3.5 text-xs">
      <p className="text-[10px] text-[#8A857D] leading-snug">
        <span className="font-semibold uppercase tracking-[0.1em] text-[#2C2621]">
          {scheduledAt ? 'Scheduled.' : 'Not going out yet.'}
        </span>{' '}
        {scheduledAt
          ? 'This post has a date and time.'
          : 'This post has no date. Pick a date and time.'}
      </p>

      {/* Internal name */}
      <div>
        <FieldLabel>Internal name</FieldLabel>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className={UNDERLINE_INPUT}
        />
      </div>

      {/* Publish to */}
      <div>
        <FieldLabel>Publish to</FieldLabel>
        <div className={SEGMENT_ROW} role="group" aria-label="Publish to">
          {visiblePlatformOptions.map(({ key, label }) => {
            const active = platforms.includes(key);
            const connected = connectedPlatforms.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePlatform(key)}
                title={`${label}${connected ? ' · Connected' : ' · Not connected'}`}
                aria-pressed={active}
                className={`${SEGMENT_BTN} ${active ? SEGMENT_ON : SEGMENT_OFF}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[10px] text-[#A8A29E]">
          Only connected accounts for this workspace will publish.
        </p>
      </div>

      {/* Format */}
      <div>
        <FieldLabel>Format</FieldLabel>
        <div className={SEGMENT_ROW} role="group" aria-label="Format">
          {(
            [
              { key: 'post', label: 'Post' },
              { key: 'reel', label: 'Reel' },
              { key: 'carousel', label: 'Carousel' },
              { key: 'story', label: 'Story' },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => applyFormat(f.key)}
              className={`${SEGMENT_BTN} ${
                contentFormat === f.key ? SEGMENT_ON : SEGMENT_OFF
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ratio */}
      <div>
        <FieldLabel>Ratio</FieldLabel>
        <div className={SEGMENT_ROW} role="group" aria-label="Ratio">
          {aspectOptions.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setMediaAspect(ratio)}
              className={`${SEGMENT_BTN} ${
                activeAspect === ratio ? SEGMENT_ON : SEGMENT_OFF
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <FieldLabel className="mb-0">Schedule</FieldLabel>
          <Info size={12} className="text-[#C4BFB6]" aria-hidden />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="sr-only">Date</span>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => applyScheduleParts(e.target.value, scheduleTime)}
              className={UNDERLINE_INPUT}
            />
          </label>
          <label className="block">
            <span className="sr-only">Time</span>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => applyScheduleParts(scheduleDate, e.target.value)}
              className={UNDERLINE_INPUT}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[11px] text-[#A8A29E]">{timezoneLabel}</p>
      </div>

      {/* Place on grid */}
      <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
        <FieldLabel className="mb-0">Place on grid</FieldLabel>
        <Checkbox
          checked={placeOnGrid}
          onCheckedChange={(v) => setPlaceOnGrid(v === true)}
          aria-label="Place on grid"
        />
      </label>

      {/* Caption */}
      <div>
        <FieldLabel>{t('studioCaption', locale)}</FieldLabel>
        <div className="rounded-sm border border-[#E6E3DB] bg-white overflow-hidden focus-within:border-[#2C2621] transition-colors">
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption…"
            className="min-h-[88px] border-0 rounded-none resize-none text-xs md:text-xs shadow-none focus-visible:ring-0 focus-visible:border-transparent px-2.5 pt-2.5 pb-1.5 placeholder:text-[#C4BFB6]"
          />
          <div className="flex items-center gap-2 px-2.5 py-1.5 border-t border-[#E6E3DB]">
            <button
              type="button"
              onClick={() => void polish()}
              disabled={polishing || !caption.trim()}
              className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#2C2621] underline underline-offset-2 disabled:opacity-40"
            >
              {polishing ? 'Polishing…' : 'Suggest caption with AI'}
            </button>
            <span className="ml-auto text-[9px] font-medium text-[#A8A29E] tabular-nums">
              {caption.length}/2200 chars
              {platforms[0]
                ? ` · ${platforms[0].charAt(0).toUpperCase()}${platforms[0].slice(1)}`
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Hashtags */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <FieldLabel className="mb-0">Hashtags</FieldLabel>
          {hashtagFavouritesMenu}
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
            className="inline-flex items-center justify-center h-8 w-8 min-h-[32px] min-w-[32px] text-[#8A857D] hover:bg-[#F0EFEA] disabled:opacity-40"
            title="Save favourite hashtags"
            aria-label="Save favourite"
          >
            <Star size={13} />
          </button>
        </div>
        <div className="rounded-sm border border-[#E6E3DB] bg-white overflow-hidden focus-within:border-[#2C2621] transition-colors">
          <Textarea
            value={hashtags}
            onChange={(e) => {
              setHashtags(e.target.value);
              setShowHashtagField(true);
            }}
            placeholder="#hashtag1 #hashtag2 #hashtag3"
            className="min-h-[56px] border-0 rounded-none resize-none font-mono text-[11px] md:text-[11px] shadow-none focus-visible:ring-0 focus-visible:border-transparent px-2.5 py-2.5 placeholder:text-[#C4BFB6]"
          />
        </div>
      </div>

      {/* Pillar */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <FieldLabel className="mb-0">Pillar</FieldLabel>
          {!creatingProject ? (
            <button
              type="button"
              onClick={() => setCreatingProject(true)}
              className={OUTLINE_BTN}
            >
              <Plus size={11} className="mr-1" strokeWidth={2.5} />
              Add pillar
            </button>
          ) : null}
        </div>
        <div className={SEGMENT_ROW} role="group" aria-label="Pillar">
          <button
            type="button"
            onClick={() => {
              setMoreOptions((prev) => ({ ...prev, campaignTag: '' }));
              setCampaignIds([]);
            }}
            className={`${SEGMENT_BTN} ${
              !moreOptions.campaignTag.trim() && campaignIds.length === 0
                ? SEGMENT_ON
                : SEGMENT_OFF
            }`}
          >
            None
          </button>
          {campaignLabels.slice(0, 6).map((c) => {
            const active =
              moreOptions.campaignTag === c.name || campaignIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setMoreOptions((prev) => ({ ...prev, campaignTag: c.name }));
                  if (!campaignIds.includes(c.id)) toggleCampaign(c.id);
                }}
                className={`${SEGMENT_BTN} ${active ? SEGMENT_ON : SEGMENT_OFF}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        {creatingProject ? (
          <div className="mt-2 space-y-2">
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Pillar name"
              autoFocus
              className={UNDERLINE_INPUT}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  !newProjectName.trim() || createProjectMutation.isPending
                }
                onClick={() => createProjectMutation.mutate()}
                className={`${OUTLINE_BTN} disabled:opacity-40`}
              >
                {createProjectMutation.isPending ? (
                  <Loader2 size={11} className="mr-1 animate-spin" />
                ) : (
                  <Plus size={11} className="mr-1" strokeWidth={2.5} />
                )}
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingProject(false);
                  setNewProjectName('');
                }}
                className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* TikTok music → uploads to TikTok drafts via Content Posting API */}
      {tiktokSelected ? (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <FieldLabel className="mb-0">TikTok music</FieldLabel>
            <InfoTooltip
              side="top"
              ariaLabel="How TikTok music drafts work"
              content={
                <>
                  When this is on, Publish uploads your video to{' '}
                  <strong>TikTok drafts / inbox</strong> (not a live post). Open
                  the TikTok app later, add your trending sound, then post from
                  drafts. Requires a connected TikTok account and a video file.
                </>
              }
            />
          </div>
          <p className="mb-2 text-[11px] text-[#8A857D] leading-snug">
            Optional. Your video is sent to TikTok drafts so you can add a
            trending sound in the app before posting.
          </p>
          <label className="flex items-center gap-2.5 min-h-[44px] rounded-sm border border-[#E6E3DB] bg-white px-2.5 cursor-pointer hover:border-[#2C2621]/40 transition-colors">
            <Checkbox
              checked={tiktokTrendingSound}
              onCheckedChange={(v) => setTiktokTrendingSound(v === true)}
              aria-label="Save to TikTok drafts for trending sound"
            />
            <span className="text-xs font-medium text-[#2C2621]">
              Save to TikTok drafts (add sound in app)
            </span>
          </label>
          {tiktokTrendingSound ? (
            <div className="mt-2 space-y-2">
              <label className="block">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D] mb-1">
                  Sound name (reminder)
                </span>
                <input
                  type="text"
                  value={trendingSoundNote}
                  onChange={(e) => setTrendingSoundNote(e.target.value)}
                  placeholder="e.g. original sound — Artist"
                  className={UNDERLINE_INPUT}
                />
              </label>
              {!hasTikTokVideo ? (
                <p className="text-[11px] font-medium text-amber-700 leading-snug">
                  Add a video — TikTok drafts require a video file (photos cannot
                  be saved as drafts via the API).
                </p>
              ) : !connectedPlatforms.has('tiktok') ? (
                <p className="text-[11px] font-medium text-amber-700 leading-snug">
                  Connect TikTok under Settings → Socials before publishing.
                </p>
              ) : (
                <p className="text-[11px] text-[#8A857D] leading-snug">
                  On Publish, the video goes to your TikTok inbox/drafts. Open
                  TikTok to attach the sound and post.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <MoreOptionsSection
        value={moreOptions}
        onChange={setMoreOptions}
        campaignSuggestions={campaignLabels.map((c) => c.name)}
      />

      {/* Status */}
      <div>
        <FieldLabel>Status</FieldLabel>
        <div className={SEGMENT_ROW} role="group" aria-label="Status">
          {STATUS_PILLS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setWorkflow(s.key)}
              className={`${SEGMENT_BTN} ${
                workflow === s.key ? SEGMENT_ON : SEGMENT_OFF
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setWorkflow('PUBLISHED')}
          className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621] underline underline-offset-2 h-9 min-h-[36px]"
        >
          Mark as posted
        </button>
      </div>

      {(() => {
        const igSelected = platforms.includes('instagram');
        const igConnected = igSelected && connectedPlatforms.has('instagram');
        const hasSchedule = Boolean(scheduleDate && scheduleTime);
        const isScheduledStatus = workflow === 'SCHEDULED';
        const hasMedia = mediaItems.some((m) => Boolean(m.url));
        const feedCropOk =
          !igSelected ||
          contentFormat === 'reel' ||
          contentFormat === 'story' ||
          activeAspect === '1:1' ||
          activeAspect === '4:5' ||
          activeAspect === '3:4' ||
          activeAspect === '1.91:1';
        const checklist = [
          {
            ok: !igSelected || igConnected,
            label: igSelected
              ? igConnected
                ? 'Instagram connected'
                : 'Instagram connected. Connect under Settings → Socials.'
              : 'Publish channel selected',
          },
          {
            ok: hasSchedule,
            label: hasSchedule
              ? 'Date and time set'
              : 'Date and time set. Add date & time.',
          },
          {
            ok: isScheduledStatus,
            label: isScheduledStatus
              ? 'Status is Scheduled'
              : 'Status is Scheduled. Schedule after approval.',
          },
          {
            ok: hasMedia,
            label: hasMedia ? 'Media attached' : 'Media attached. Add media.',
          },
          {
            ok: feedCropOk,
            label: feedCropOk
              ? 'Instagram feed crop (4:5, 3:4, 1:1, or 1.91:1)'
              : 'Instagram feed crop (4:5, 3:4, 1:1, or 1.91:1). Switch ratio or format.',
          },
        ];
        const left = checklist.filter((c) => !c.ok).length;
        return (
          <Accordion
            type="multiple"
            defaultValue={['checklist', 'notes', 'feedback']}
            className="border-t border-[#E6E3DB] mt-1"
          >
            <AccordionItem value="checklist" className="border-b border-[#E6E3DB]">
              <AccordionTrigger className="py-3 hover:no-underline gap-2">
                <span className="flex flex-1 items-center gap-2 min-w-0 text-left">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                    Auto-publish checklist
                  </span>
                  {left > 0 ? (
                    <span className="text-[9px] font-medium text-red-600 truncate">
                      {left} left. Won&apos;t auto-publish until completed.
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium text-emerald-700">
                      Ready to auto-publish
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-start gap-2 text-[11px] text-[#2C2621]"
                    >
                      {item.ok ? (
                        <Check
                          size={13}
                          className="mt-0.5 text-emerald-600 flex-shrink-0"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Circle
                          size={12}
                          className="mt-0.5 text-[#C4BFB6] flex-shrink-0"
                          strokeWidth={1.75}
                        />
                      )}
                      <span className={item.ok ? 'text-[#5C574F]' : 'text-[#8A857D]'}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notes" className="border-b border-[#E6E3DB]">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                  Notes
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                    Internal notes{' '}
                    <span className="font-normal italic normal-case tracking-normal text-[#A8A29E]">
                      team and account owner
                    </span>
                  </p>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Notes only your team and account owner can see…"
                    className="min-h-[72px] rounded-sm border-[#E6E3DB] text-xs resize-y"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                    Notes for client{' '}
                    <span className="font-normal italic normal-case tracking-normal text-[#A8A29E]">
                      shown in client portal
                    </span>
                  </p>
                  <Textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Notes the client can see in their portal…"
                    className="min-h-[72px] rounded-sm border-[#E6E3DB] text-xs resize-y"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="feedback" className="border-b border-[#E6E3DB]">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                  Feedback
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <div>
                    {localComments.length === 0 ? (
                      <p className="text-[12px] text-[#8A857D]">
                        No notes yet. Add the first.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {localComments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-sm border border-[#E6E3DB] bg-white px-2.5 py-2"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-semibold text-[#2C2621]">
                                {c.author_name}
                              </span>
                              <span className="text-[9px] text-[#A8A29E]">
                                {formatRelative(c.created_at)}
                              </span>
                            </div>
                            {c.text ? (
                              <p className="text-[11px] text-[#5C574F] whitespace-pre-wrap">
                                {c.text}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#E6E3DB] pt-4 space-y-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                      Reply
                    </p>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a note to this thread…"
                      className="min-h-[96px] rounded-sm border-[#E6E3DB] bg-white text-xs md:text-xs resize-none shadow-none focus-visible:ring-0 focus-visible:border-[#2C2621] placeholder:text-[#C4BFB6]"
                    />
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setChatVisibility('private');
                          void sendComment();
                        }}
                        disabled={sending || !comment.trim()}
                        className="inline-flex items-center justify-center h-9 min-h-[36px] px-4 bg-[#8A857D] text-white text-[9px] font-semibold uppercase tracking-[0.14em] disabled:opacity-40 hover:bg-[#2C2621] transition-colors"
                      >
                        {sending ? 'Sending…' : 'Send reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="advanced" className="border-b-0">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                  Advanced settings
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
            <div>
              <FieldLabel>{t('campaignLabels', locale)}</FieldLabel>
              <p className="text-[11px] text-[#8A857D] mb-2 -mt-0.5 leading-snug">
                {t('campaignLabelsHint', locale)}
              </p>
              {creatingProject ? (
                <div className="border border-[#E6E3DB] rounded-sm p-3 space-y-3 bg-white">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
                    {t('newProject', locale)}
                  </p>
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={t('projectNamePlaceholder', locale)}
                    autoFocus
                    className={UNDERLINE_INPUT}
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
                        className={`w-6 h-6 min-h-[24px] ${
                          newProjectColor === c
                            ? 'ring-2 ring-offset-1 ring-[#2C2621]'
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
                      className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621]"
                    >
                      {t('cancel', locale)}
                    </button>
                    <button
                      type="button"
                      disabled={
                        !newProjectName.trim() || createProjectMutation.isPending
                      }
                      onClick={() => createProjectMutation.mutate()}
                      className={`${OUTLINE_BTN} disabled:opacity-40`}
                    >
                      {createProjectMutation.isPending ? (
                        <Loader2 size={11} className="mr-1 animate-spin" />
                      ) : (
                        <Plus size={11} className="mr-1" strokeWidth={2.5} />
                      )}
                      {t('createProject', locale)}
                    </button>
                  </div>
                </div>
              ) : campaignLabels.length === 0 ? (
                <div className="border border-dashed border-[#E6E3DB] rounded-sm px-3 py-3 space-y-2">
                  <p className="text-[11px] text-[#8A857D]">
                    {t('noProjectsYet', locale)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreatingProject(true)}
                    className={OUTLINE_BTN}
                  >
                    <Plus size={11} className="mr-1" strokeWidth={2.5} />
                    {t('createProject', locale)}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {campaignLabels.map((c) => {
                    const active = campaignIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCampaign(c.id)}
                        className={`inline-flex items-center gap-1.5 h-8 min-h-[32px] px-2.5 border text-[10px] font-medium transition-colors ${
                          active
                            ? 'border-[#1C1917] bg-[#1C1917] text-white'
                            : 'border-[#E6E3DB] bg-white text-[#5C574F] hover:border-[#2C2621]/40'
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 flex-shrink-0"
                          style={{ background: active ? '#fff' : c.color }}
                        />
                        {c.name}
                        {active ? <Check size={11} /> : null}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCreatingProject(true)}
                    className="inline-flex items-center gap-1 h-8 min-h-[32px] px-2.5 border border-dashed border-[#E6E3DB] bg-white text-[10px] font-medium text-[#8A857D] hover:border-[#2C2621] hover:text-[#2C2621] transition-colors"
                  >
                    <Plus size={11} strokeWidth={2.5} />
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
                    className="flex items-center gap-2 h-9 min-h-[36px] px-2 border border-[#E6E3DB] rounded-sm bg-white"
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
                      className={`flex-1 text-xs ${
                        task.done
                          ? 'line-through text-[#A8A29E]'
                          : 'text-[#2C2621]'
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
                      className="h-8 w-8 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#C4BFB6] hover:text-[#2C2621]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <input
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
                  className={`flex-1 ${UNDERLINE_INPUT}`}
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
                  className={OUTLINE_BTN}
                  aria-label="Add subtask"
                >
                  <Plus size={11} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
          </Accordion>
        );
      })()}
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
            className={`flex-1 h-10 min-h-[40px] rounded-md text-xs font-medium transition-colors ${
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
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 flex-shrink-0" />
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
                <div className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2">
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
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  const footerActions = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 border-t border-[#E6E3DB] bg-white flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {canDeletePost ? (
          <button
            type="button"
            onClick={() => void deletePost()}
            disabled={deleting || saving}
            className="h-11 min-h-[44px] px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600 hover:text-red-700 disabled:opacity-40"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving || !caption.trim() || platforms.length === 0}
          onClick={() => {
            setWorkflow('READY');
            void save('draft', { workflowOverride: 'READY' });
          }}
          className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-sm bg-[#1C1917] text-white text-[11px] font-semibold uppercase tracking-[0.14em] disabled:opacity-40 hover:bg-[#2C2621]"
        >
          Send to approval
        </button>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-11 min-h-[44px] px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A857D] hover:text-[#2C2621]"
        >
          Cancel
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={saving || !caption.trim() || platforms.length === 0}
              className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-sm bg-[#1C1917] text-white text-[11px] font-semibold uppercase tracking-[0.14em] disabled:opacity-40 hover:bg-[#2C2621]"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  Save
                  <ChevronDown size={14} className="opacity-80" />
                </>
              )}
            </button>
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
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="h-11 min-h-[44px] gap-2 cursor-pointer font-semibold"
              disabled={
                saving ||
                ![...platforms].some((p) => connectedPlatforms.has(p)) ||
                (platforms.includes('tiktok') &&
                  !mediaItems.some((m) => Boolean(m.url)))
              }
              onSelect={() => void save('post')}
            >
              <Send size={14} />
              {t('publishNow', locale)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden flex flex-col border border-[#E6E3DB] bg-white
          w-full max-w-none sm:max-w-[min(1200px,96vw)]
          h-[100dvh] max-h-[100dvh] sm:h-[min(880px,92vh)] sm:max-h-[92vh]
          rounded-none sm:rounded-sm
          top-0 left-0 translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]
          shadow-[0_12px_30px_-12px_rgba(44,38,33,0.08)]"
      >
        {/* Header — Post Details */}
        <div className="flex items-center gap-3 px-4 sm:px-5 h-12 border-b border-[#E6E3DB] flex-shrink-0">
          <DialogTitle className="sr-only">Post Details</DialogTitle>
          <div className="flex items-baseline gap-2 min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2C2621] truncate">
              ( {contentFormat} details ) {contentFormat}
            </p>
            <p className="hidden sm:inline text-[11px] text-[#A8A29E] truncate">
              Edited by Ebba · just now
            </p>
          </div>
          <p className="hidden md:block text-[10px] uppercase tracking-[0.12em] text-[#C4BFB6]">
            Drag header to move
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!canShare && !shareCopied}
                className="hidden sm:inline-flex h-10 min-h-[40px] px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A857D] hover:text-[#2C2621] items-center gap-1 disabled:opacity-40"
                title="Share with a client"
              >
                {sharing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : shareCopied ? (
                  <Check size={13} />
                ) : (
                  <Share2 size={13} />
                )}
                Share
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
                onSelect={() => setEmailShareOpen(true)}
              >
                <Mail size={14} />
                Email client…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-sm text-[#8A857D] hover:bg-[#F0EFEA] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile: media / details / team */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            {mobilePane === 'preview' && mediaColumn}
            {mobilePane === 'editor' && editorPane}
            {mobilePane === 'team' && teamContent}
          </div>
          <nav className="flex-shrink-0 grid grid-cols-3 border-t border-[#E6E3DB] bg-white pb-[env(safe-area-inset-bottom)]">
            {(
              [
                { key: 'preview' as const, label: 'Media', icon: ImageIcon },
                { key: 'editor' as const, label: 'Details', icon: FileText },
                { key: 'team' as const, label: t('teamTab', locale), icon: MessageCircle },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMobilePane(key)}
                className={`flex flex-col items-center justify-center gap-0.5 h-14 min-h-[56px] text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  mobilePane === key ? 'text-[#2C2621]' : 'text-[#A8A29E]'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          {footerActions}
        </div>

        {/* Desktop: media left · form right */}
        <div className="hidden lg:grid flex-1 min-h-0 grid-cols-[minmax(280px,2fr)_minmax(0,3fr)] overflow-hidden">
          <section className="border-r border-[#E6E3DB] min-h-0 overflow-hidden">
            {mediaColumn}
          </section>
          <section className="min-h-0 overflow-hidden">{editorPane}</section>
        </div>
        <div className="hidden lg:block">{footerActions}</div>
      </DialogContent>
    </Dialog>

      {/* Email client invite — sibling dialog so Studio stays open underneath */}
      <Dialog
        open={emailShareOpen}
        onOpenChange={(open) => {
          if (!sharing) setEmailShareOpen(open);
        }}
      >
        <DialogContent className="max-w-[min(420px,94vw)] rounded-lg border-slate-200 z-[90]">
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
                className="h-10 min-h-[40px] rounded-md border-slate-200 text-sm"
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
                className="min-h-[72px] rounded-md border-slate-200 text-sm resize-none"
                disabled={sharing}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setEmailShareOpen(false)}
              disabled={sharing}
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void emailShareLink()}
              disabled={sharing || !emailTo.trim() || !caption.trim()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
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
