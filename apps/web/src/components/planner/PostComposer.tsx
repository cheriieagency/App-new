'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Loader2,
  Send,
  Sparkles,
  FileText,
  Smile,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { YouTubeIcon } from '@/components/icons/SocialBrandIcons';
import CarouselMediaUploader from '@/components/planner/CarouselMediaUploader';
import FeedPreview from '@/components/planner/FeedPreview';
import {
  YOUTUBE_CATEGORIES,
  YOUTUBE_PRIVACY_OPTIONS,
  type AiContentIdea,
  type PlannerMediaItem,
  type PlannerPost,
  type PlannerPostStatus,
  type SocialPlatform,
  type YoutubeMeta,
  type YoutubePrivacy,
} from '@/lib/mock-content-planner';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const EMOJIS = ['🔥', '✨', '🙌', '💡', '🚀', '❤️', '👇', '😊', '💪', '🎯', '📈', '✅'];

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

function defaultYoutube(seedTitle?: string): YoutubeMeta {
  return {
    title: (seedTitle || '').slice(0, 100),
    privacy: 'public',
    is_shorts: true,
    category: 'Education',
    tags: [],
  };
}

export default function PostComposer({
  open,
  onOpenChange,
  initial,
  seedIdea,
  seedPlatform,
  defaultScheduledAt,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PlannerPost | null;
  seedIdea?: AiContentIdea | null;
  seedPlatform?: SocialPlatform | null;
  defaultScheduledAt?: string | null;
  onSaved: () => void;
}) {
  const { locale } = useLanguage();
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['instagram']);
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediaItems, setMediaItems] = useState<PlannerMediaItem[]>([]);
  const [ideaTitle, setIdeaTitle] = useState<string | undefined>();
  const [youtube, setYoutube] = useState<YoutubeMeta>(defaultYoutube());
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const hasYoutube = platforms.includes('youtube');

  // Sync form when dialog opens with new seed/initial.
  useEffect(() => {
    if (!open) return;
    if (initial?.id) {
      setCaption(initial.caption);
      setPlatforms(initial.platforms);
      setScheduledAt(toLocalInputValue(initial.scheduled_at));
      setMediaItems(initial.media_items?.length
        ? initial.media_items
        : initial.media_url
          ? [
              {
                id: 'legacy',
                url: initial.media_url,
                type: initial.media_type === 'video' ? 'video' : 'image',
              },
            ]
          : []);
      setIdeaTitle(initial.idea_title);
      const yt = initial.youtube ?? defaultYoutube(initial.idea_title || initial.caption);
      setYoutube(yt);
      setTagsInput(yt.tags.join(', '));
      return;
    }
    if (seedIdea && seedPlatform) {
      const caps =
        seedIdea.captions[seedPlatform] || Object.values(seedIdea.captions)[0] || '';
      setCaption(caps);
      setPlatforms(Object.keys(seedIdea.captions) as SocialPlatform[]);
      setScheduledAt(toLocalInputValue(defaultScheduledAt));
      setMediaItems([]);
      setIdeaTitle(seedIdea.title);
      const yt = defaultYoutube(seedIdea.title);
      setYoutube(yt);
      setTagsInput('');
      return;
    }
    setCaption('');
    setPlatforms(['instagram']);
    setScheduledAt(toLocalInputValue(defaultScheduledAt));
    setMediaItems([]);
    setIdeaTitle(undefined);
    setYoutube(defaultYoutube());
    setTagsInput('');
  }, [open, initial, seedIdea, seedPlatform, defaultScheduledAt]);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) => {
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      if (p === 'youtube' && !prev.includes('youtube') && !youtube.title) {
        setYoutube((y) => ({
          ...y,
          title: (ideaTitle || caption.split('\n')[0] || '').slice(0, 100),
        }));
      }
      return next;
    });
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

  const save = async (status: PlannerPostStatus) => {
    if (!caption.trim() || platforms.length === 0 || saving) return;
    if (hasYoutube && !youtube.title.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput
        .split(/[,#]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        action: 'upsert',
        id: initial?.id || undefined,
        title: ideaTitle || caption.split('\n')[0].slice(0, 60) || t('newPostDefault', locale),
        caption,
        platforms,
        status,
        workflow:
          status === 'published'
            ? 'PUBLISHED'
            : status === 'scheduled'
              ? 'SCHEDULED'
              : 'IN_PROGRESS',
        media_items: mediaItems,
        idea_title: ideaTitle,
        youtube: hasYoutube
          ? {
              ...youtube,
              title: youtube.title.slice(0, 100),
              tags,
            }
          : null,
      };
      if (status === 'scheduled') {
        if (!scheduledAt) {
          setSaving(false);
          return;
        }
        payload.scheduled_at = new Date(scheduledAt).toISOString();
        payload.published_at = null;
      } else if (status === 'published') {
        payload.published_at = new Date().toISOString();
        payload.scheduled_at = new Date().toISOString();
      } else {
        payload.scheduled_at = scheduledAt ? new Date(scheduledAt).toISOString() : null;
        payload.published_at = null;
      }

      const r = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('save failed');
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto rounded-2xl p-0 gap-0">
        <div className="p-5 sm:p-6 border-b border-zinc-100">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[#2c3340] font-black">
              {initial?.id ? t('editPost', locale) : t('createSchedulePost', locale)}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 font-medium">
              {t('crossPostDesc', locale)}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0">
          <div className="p-5 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-zinc-100">
            <CarouselMediaUploader items={mediaItems} onChange={setMediaItems} />

            {/* Platforms */}
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                {t('crossPosting', locale)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map(({ key, label }) => {
                  const checked = platforms.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-center gap-2 h-11 min-h-[44px] rounded-xl border text-xs font-extrabold cursor-pointer transition-colors ${
                        checked
                          ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)] text-[#2c3340]'
                          : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePlatform(key)}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* YouTube-specific metadata */}
            {hasYoutube && (
              <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4 space-y-3">
                <p className="text-xs font-black text-[#2c3340] flex items-center gap-1.5">
                  <YouTubeIcon size={14} className="text-red-600" /> {t('youtubeSettings', locale)}
                </p>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('videoTitleLabel', locale)} ({youtube.title.length}/100)
                  </label>
                  <Input
                    value={youtube.title}
                    maxLength={100}
                    onChange={(e) =>
                      setYoutube((y) => ({ ...y, title: e.target.value.slice(0, 100) }))
                    }
                    placeholder={t('youtubeTitlePlaceholder', locale)}
                    className="rounded-xl border-zinc-200 h-11"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('privacyStatus', locale)}
                  </label>
                  <select
                    value={youtube.privacy}
                    onChange={(e) =>
                      setYoutube((y) => ({
                        ...y,
                        privacy: e.target.value as YoutubePrivacy,
                      }))
                    }
                    className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340] focus:outline-none focus:border-[var(--nc-coral)]"
                  >
                    {YOUTUBE_PRIVACY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center justify-between gap-3 h-11 min-h-[44px] rounded-xl bg-white border border-zinc-100 px-3">
                  <span className="text-xs font-extrabold text-[#2c3340]">
                    {t('publishAsShorts', locale)}
                  </span>
                  <Switch
                    checked={youtube.is_shorts}
                    onCheckedChange={(checked) =>
                      setYoutube((y) => ({ ...y, is_shorts: Boolean(checked) }))
                    }
                  />
                </label>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('videoCategory', locale)}
                  </label>
                  <select
                    value={youtube.category}
                    onChange={(e) =>
                      setYoutube((y) => ({ ...y, category: e.target.value }))
                    }
                    className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340] focus:outline-none focus:border-[var(--nc-coral)]"
                  >
                    {YOUTUBE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('tagsLabel', locale)}
                  </label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t('tagsPlaceholder', locale)}
                    className="rounded-xl border-zinc-200 h-11"
                  />
                  <p className="text-[11px] text-zinc-400 font-medium mt-1">
                    {t('separateWithCommas', locale)}
                  </p>
                </div>
              </div>
            )}

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  {t('studioCaption', locale)}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className="h-10 min-h-[44px] px-2 rounded-lg text-zinc-500 hover:bg-zinc-100 inline-flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Smile size={14} /> {t('emojiBtn', locale)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void polish()}
                    disabled={polishing || !caption.trim()}
                    className="h-10 min-h-[44px] px-2 rounded-lg text-[var(--nc-coral)] hover:bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)] inline-flex items-center gap-1 text-[11px] font-extrabold disabled:opacity-40"
                  >
                    {polishing ? (
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    {t('polishWithAi', locale)}
                  </button>
                </div>
              </div>
              {showEmoji && (
                <div className="flex flex-wrap gap-1 mb-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setCaption((c) => c + e)}
                      className="h-11 w-11 min-h-[44px] min-w-[44px] text-lg rounded-lg hover:bg-white"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('captionPlaceholder', locale)}
                className="min-h-[120px] rounded-xl border-zinc-200 resize-none text-sm"
              />
            </div>

            {/* Schedule */}
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
                {t('dateAndTime', locale)}
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340] focus:outline-none focus:border-[var(--nc-coral)]"
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={
                  saving ||
                  !caption.trim() ||
                  platforms.length === 0 ||
                  (hasYoutube && !youtube.title.trim())
                }
                onClick={() => void save('draft')}
                className="h-11 min-h-[44px] rounded-xl font-extrabold gap-1.5"
              >
                <FileText size={14} /> {t('saveDraft', locale)}
              </Button>
              <Button
                type="button"
                disabled={
                  saving ||
                  !caption.trim() ||
                  platforms.length === 0 ||
                  (hasYoutube && !youtube.title.trim())
                }
                onClick={() => void save('published')}
                className="h-11 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold gap-1.5"
              >
                <Send size={14} /> {t('publishNow', locale)}
              </Button>
              <Button
                type="button"
                disabled={
                  saving ||
                  !caption.trim() ||
                  platforms.length === 0 ||
                  !scheduledAt ||
                  (hasYoutube && !youtube.title.trim())
                }
                onClick={() => void save('scheduled')}
                className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-extrabold gap-1.5"
              >
                <CalendarClock size={14} /> {t('schedulePost', locale)}
              </Button>
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-zinc-50/50">
            <FeedPreview
              caption={caption || t('captionPreviewPlaceholder', locale)}
              mediaItems={mediaItems}
              platforms={platforms}
              youtube={
                hasYoutube
                  ? {
                      ...youtube,
                      tags: tagsInput
                        .split(/[,#]+/)
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }
                  : null
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
