'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  ImageIcon,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Smile,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
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
  type PlannerPost,
  type PlannerSubtask,
  type SocialPlatform,
  type WorkflowStatus,
} from '@/lib/mock-content-planner';
import { useLocale } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

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
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PlannerPost | null;
  projectName: string;
  workspaces: BrandWorkspace[];
  onSaved: () => void;
}) {
  const { locale } = useLocale();
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
      setSubtasks(post.subtasks);
      setMediaItems(post.media_items ?? []);
      setLocalComments(post.comments ?? []);
      setLocalActivity(post.activity ?? []);
    } else {
      setTitle('');
      setCaption('');
      setHashtags('');
      setPlatforms(['instagram']);
      setWorkflow('IDEA');
      setProject(projectName);
      setScheduledAt('');
      setAutoPost(false);
      setAssignees([PLANNER_TEAM[0]]);
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
  }, [open, post, projectName]);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
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
        body: JSON.stringify({ action: 'polish', caption }),
      });
      const data = await r.json();
      if (data.caption) setCaption(data.caption);
    } finally {
      setPolishing(false);
    }
  };

  const save = async (publish = false) => {
    if (!title.trim() || platforms.length === 0 || saving) return;
    setSaving(true);
    try {
      const nextWorkflow = publish ? 'PUBLISHED' : workflow;
      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          id: post?.id,
          title,
          caption,
          hashtags,
          platforms,
          workflow: nextWorkflow,
          project,
          assignees,
          subtasks,
          media_items: mediaItems,
          auto_post: autoPost,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          actor: 'Ebba',
        }),
      });
      if (!r.ok) throw new Error('save failed');
      onSaved();
      onOpenChange(false);
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
      <div>
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
          {t('postTitle', locale)}
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('postTitle', locale)}
          className="h-11 rounded-xl border-zinc-200 font-extrabold text-[#2c3340]"
        />
      </div>

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
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
          Target Platforms
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_OPTIONS.map(({ key, label }) => {
            const checked = platforms.includes(key);
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
                {label}
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
              {title || 'Nytt inlägg'}
            </p>
          </div>
          <button
            type="button"
            className="hidden sm:inline-flex h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 items-center gap-1.5"
          >
            <Share2 size={13} /> Share
          </button>
          <Button
            type="button"
            onClick={() => void save(false)}
            disabled={saving || !title.trim() || platforms.length === 0}
            className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-extrabold px-3 sm:px-4 text-xs sm:text-sm"
          >
            {saving ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <span className="sm:hidden">Spara</span>
                <span className="hidden sm:inline">Publicera / Spara</span>
              </>
            )}
          </Button>
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
