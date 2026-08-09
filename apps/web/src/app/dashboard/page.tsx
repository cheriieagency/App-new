'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Calendar,
  GraduationCap,
  Send,
  PlayCircle,
  Heart,
  Users,
  CheckCircle2,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Radio,
  Trophy,
  Image as ImageIcon,
  X,
  Reply,
  Pin,
  Flame,
  Star,
  Medal,
  Crown,
  Sparkles,
  Copy,
  Gift,
  LinkIcon,
  Home,
  Search,
  User,
  Plus,
  Video,
  FileText,
  Loader2,
  ShoppingBag,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import useHandleStreamResponse from '@/utils/useHandleStreamResponse';
import useUpload from '@/utils/useUpload';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import {
  CommunitySearchAutocomplete,
  type SearchableCommunity,
} from '@/components/landing/CommunitySearchAutocomplete';
import { getMockCommunitiesForUser, normalizeCommunities } from '@/lib/mock-communities';
import ClassroomView from '@/components/classroom/ClassroomView';
import StoreView from '@/components/store/StoreView';
import { normalizeClassroomCourses } from '@/lib/classroom-content';

type TabKey = 'community' | 'events' | 'classroom' | 'store';
type CommunitySubTab = 'feed' | 'leaderboard';
type SidebarView = 'home' | 'search' | 'profile' | 'community';
interface CountdownMap {
  [key: number]: string;
}

const LEVELS = [
  {
    min: 0,
    max: 99,
    label: 'Brons',
    color: '#CD7F32',
    bg: '#FDF3E7',
    ring: '#F59E0B',
    icon: Medal,
  },
  {
    min: 100,
    max: 249,
    label: 'Silver',
    color: '#9CA3AF',
    bg: '#F3F4F6',
    ring: '#9CA3AF',
    icon: Star,
  },
  {
    min: 250,
    max: 499,
    label: 'Guld',
    color: '#D97706',
    bg: '#FFFBEB',
    ring: '#F59E0B',
    icon: Trophy,
  },
  {
    min: 500,
    max: Infinity,
    label: 'Platinum',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    ring: '#8B5CF6',
    icon: Crown,
  },
];
function getLevel(points: number) {
  return LEVELS.find((l) => points >= l.min && points <= l.max) ?? LEVELS[0];
}
function getLevelProgress(points: number) {
  const lvl = getLevel(points);
  if (lvl.max === Infinity) return 100;
  return Math.round(((points - lvl.min) / (lvl.max - lvl.min)) * 100);
}

const TAGS = [
  { label: '#Frågor', color: 'bg-blue-100 text-blue-700', dot: '#3B82F6' },
  { label: '#Inspiration', color: 'bg-violet-100 text-[#6b5bb8]', dot: '#8B5CF6' },
  { label: '#Resultat', color: 'bg-green-100 text-green-700', dot: '#10B981' },
  { label: '#Tips', color: 'bg-amber-100 text-amber-700', dot: '#F59E0B' },
  { label: '#Milstolpe', color: 'bg-rose-100 text-rose-700', dot: '#F43F5E' },
];
function tagStyle(tag: string | null) {
  return TAGS.find((t) => t.label === `#${tag}`) ?? TAGS[0];
}

function LevelAvatar({
  name,
  image,
  points,
  size = 36,
}: {
  name: string;
  image?: string | null;
  points?: number;
  size?: number;
}) {
  const lvl = getLevel(points ?? 0);
  const progress = getLevelProgress(points ?? 0);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${lvl.ring} ${progress}%, #E5E7EB 0)` }}
      />
      <div className="absolute inset-[2px] rounded-full bg-white flex items-center justify-center overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center font-black text-white text-sm"
            style={{ background: `linear-gradient(135deg, ${lvl.ring}, ${lvl.color})` }}
          >
            {name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      {points !== undefined && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white"
          style={{ background: lvl.color }}
        >
          <span className="text-white font-black" style={{ fontSize: 7 }}>
            {LEVELS.indexOf(lvl) + 1}
          </span>
        </div>
      )}
    </div>
  );
}

function CommentMedia({ url, type }: { url: string; type: string }) {
  if (type?.startsWith('image/')) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-zinc-100 max-w-xs">
        <img src={url} alt="Bilaga" className="w-full max-h-48 object-cover" />
      </div>
    );
  }
  if (type?.startsWith('video/')) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-zinc-100 max-w-xs">
        <video src={url} controls className="w-full max-h-48" />
      </div>
    );
  }
  const filename = url.split('/').pop() ?? 'Dokument';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors w-fit max-w-xs"
    >
      <FileText size={14} className="text-zinc-500 flex-shrink-0" />
      <span className="text-xs font-bold text-zinc-700 truncate">{filename}</span>
    </a>
  );
}

function CommentsSection({ postId, session }: { postId: number; session: any }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyToName, setReplyToName] = useState('');
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: string } | null>(null);
  const [upload, { loading: uploading }] = useUpload();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await fetch(`/api/comments?post_id=${postId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const handleFileUpload = async (file: File) => {
    const result = await upload({ file });
    if (result.error) {
      console.error(result.error);
      return;
    }
    if (result.url) setPendingMedia({ url: result.url, type: result.mimeType ?? file.type });
  };

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content: reply,
          parent_id: replyTo,
          media_url: pendingMedia?.url ?? null,
          media_type: pendingMedia?.type ?? null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setReply('');
      setReplyTo(null);
      setReplyToName('');
      setPendingMedia(null);
    },
  });

  const pinComment = useMutation({
    mutationFn: async ({
      comment_id,
      action,
    }: {
      comment_id: number;
      action: 'pin' | 'unpin';
    }) => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment_id }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_res, vars) => {
      queryClient.setQueryData(['comments', postId], (prev: unknown) => {
        if (!Array.isArray(prev)) return prev;
        return prev
          .map((c: any) =>
            c.id === vars.comment_id
              ? {
                  ...c,
                  is_pinned: vars.action === 'pin',
                  pinned_at:
                    vars.action === 'pin' ? new Date().toISOString() : null,
                }
              : c
          )
          .sort((a: any, b: any) => {
            const ap = a.is_pinned ? 1 : 0;
            const bp = b.is_pinned ? 1 : 0;
            if (ap !== bp) return bp - ap;
            return (
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
      });
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  const topLevel = (comments as any[])
    .filter((c) => !c.parent_id)
    .slice()
    .sort((a, b) => {
      const ap = a.is_pinned ? 1 : 0;
      const bp = b.is_pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  const nested = (comments as any[]).filter((c) => !!c.parent_id);
  const canPin = Boolean(session?.user);

  return (
    <div className="border-t border-zinc-50 pt-3 mt-3">
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f);
          e.target.value = '';
        }}
      />
      <input
        ref={vidInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f);
          e.target.value = '';
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f);
          e.target.value = '';
        }}
      />

      {!isLoading && (
        <div className="space-y-3 mb-3">
          {topLevel.map((c: any) => (
            <div key={c.id}>
              <div className="flex gap-2.5">
                <LevelAvatar name={c.user_name} size={28} />
                <div className="flex-1 min-w-0">
                  <div
                    className={`rounded-xl rounded-tl-none px-3 py-2 ${
                      c.is_pinned
                        ? 'bg-[#f2eeff] border border-[#ffe0d4]'
                        : 'bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-xs font-black text-zinc-800">{c.user_name}</span>
                      {c.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--nc-coral)] bg-white/80 px-1.5 py-0.5 rounded-full">
                          <Pin size={9} /> Fäst
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-600 leading-relaxed">{c.content}</span>
                    {c.media_url && <CommentMedia url={c.media_url} type={c.media_type} />}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 ml-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(c.id);
                        setReplyToName(c.user_name);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="flex items-center gap-1 h-9 min-h-[36px] px-2 text-[10px] font-bold text-zinc-400 hover:text-blue-500 transition-colors"
                    >
                      <Reply size={10} /> Svara
                    </button>
                    {canPin && (
                      <button
                        type="button"
                        disabled={pinComment.isPending}
                        onClick={() =>
                          pinComment.mutate({
                            comment_id: c.id,
                            action: c.is_pinned ? 'unpin' : 'pin',
                          })
                        }
                        className={`flex items-center gap-1 h-9 min-h-[36px] px-2 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                          c.is_pinned
                            ? 'text-[var(--nc-coral)] hover:text-[#6b5bb8]'
                            : 'text-zinc-400 hover:text-[var(--nc-coral)]'
                        }`}
                      >
                        <Pin size={10} />
                        {c.is_pinned ? 'Ta bort fästning' : 'Fäst'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {nested
                .filter((n: any) => n.parent_id === c.id)
                .map((n: any) => (
                  <div key={n.id} className="flex gap-2 mt-2 ml-8">
                    <LevelAvatar name={n.user_name} size={24} />
                    <div className="flex-1 bg-blue-50 rounded-xl rounded-tl-none px-3 py-2">
                      <span className="text-xs font-black text-blue-700">{n.user_name} </span>
                      <span className="text-xs text-zinc-600 leading-relaxed">{n.content}</span>
                      {n.media_url && <CommentMedia url={n.media_url} type={n.media_type} />}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-start">
        <LevelAvatar name={session?.user?.name ?? '?'} image={session?.user?.image} size={28} />
        <div className="flex-1">
          {replyTo && (
            <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 bg-blue-50 rounded-lg w-fit">
              <Reply size={10} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-600">Svarar {replyToName}</span>
              <button
                onClick={() => {
                  setReplyTo(null);
                  setReplyToName('');
                }}
              >
                <X size={10} className="text-blue-400 hover:text-blue-700" />
              </button>
            </div>
          )}
          {pendingMedia && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-xl border border-blue-100">
              {pendingMedia.type?.startsWith('image/') ? (
                <img src={pendingMedia.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  {pendingMedia.type?.startsWith('video/') ? (
                    <Video size={16} className="text-blue-500" />
                  ) : (
                    <FileText size={16} className="text-blue-500" />
                  )}
                </div>
              )}
              <span className="text-xs font-bold text-blue-700 flex-1 truncate">Bilaga vald</span>
              <button
                onClick={() => setPendingMedia(null)}
                className="text-blue-400 hover:text-blue-700"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {uploading && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-zinc-50 rounded-xl">
              <Loader2
                size={12}
                className="text-zinc-400"
                style={{ animation: 'spin 1s linear infinite' }}
              />
              <span className="text-xs text-zinc-500 font-medium">Laddar upp...</span>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              placeholder={replyTo ? `Svara ${replyToName}...` : 'Skriv en kommentar...'}
              className="flex-1 text-xs bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-blue-200 focus:ring-1 focus:ring-blue-100 min-h-[36px] max-h-[80px]"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && reply.trim()) {
                  e.preventDefault();
                  addComment.mutate();
                }
              }}
              rows={1}
            />
            <button
              onClick={() => addComment.mutate()}
              disabled={(!reply.trim() && !pendingMedia) || addComment.isPending || uploading}
              className="w-8 h-8 rounded-full bg-[var(--nc-coral)] flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0 mt-0.5"
            >
              <Send size={12} className="text-white" />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <button
              onClick={() => imgInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
            >
              <ImageIcon size={11} /> Bild
            </button>
            <button
              onClick={() => vidInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-violet-500 hover:bg-[#f2eeff] transition-all"
            >
              <Video size={11} /> Video
            </button>
            <button
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
            >
              <FileText size={11} /> Dokument
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLanguage();

  const [sidebarView, setSidebarView] = useState<SidebarView>('home');
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [communitySearch, setCommunitySearch] = useState('');
  const [mobileCommunitiesOpen, setMobileCommunitiesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('community');
  const [communitySubTab, setCommunitySubTab] = useState<CommunitySubTab>('feed');
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState<CountdownMap>({});
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [rsvpdEvents, setRsvpdEvents] = useState<Set<number>>(new Set());
  const [liveEvent, setLiveEvent] = useState<any>(null);
  const [newPost, setNewPost] = useState('');
  const [postTag, setPostTag] = useState<string | null>(null);
  const [postImage, setPostImage] = useState('');
  const [showImage, setShowImage] = useState(false);
  const [refLinkCopied, setRefLinkCopied] = useState(false);
  const [showMemberChat, setShowMemberChat] = useState(false);
  const [memberChatMessages, setMemberChatMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [memberChatInput, setMemberChatInput] = useState('');
  const [memberChatLoading, setMemberChatLoading] = useState(false);
  const [memberStreamingMsg, setMemberStreamingMsg] = useState('');
  const memberChatRef = useRef<HTMLDivElement>(null);

  const handleFinishMemberChat = useCallback((msg: string) => {
    setMemberChatMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
    setMemberStreamingMsg('');
    setMemberChatLoading(false);
  }, []);
  const handleMemberChatStream = useHandleStreamResponse({
    onChunk: setMemberStreamingMsg,
    onFinish: handleFinishMemberChat,
  });

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (memberChatRef.current) memberChatRef.current.scrollTop = memberChatRef.current.scrollHeight;
  }, [memberChatMessages, memberStreamingMsg]);
  const {
    data: apiCommunities,
    isLoading: isCommunitiesLoading,
    isError: isCommunitiesError,
  } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const r = await fetch('/api/communities');
      const data = await r.json();
      if (!r.ok || !Array.isArray(data)) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'Failed to fetch communities'
        );
      }
      return normalizeCommunities(data);
    },
    enabled: !!session,
    retry: 1,
  });

  // Prefer API data; fall back to local mocks while loading or on error.
  const communities = useMemo((): SearchableCommunity[] => {
    if (Array.isArray(apiCommunities) && apiCommunities.length > 0) return apiCommunities;
    if (isCommunitiesLoading || isCommunitiesError || !apiCommunities) {
      return getMockCommunitiesForUser({
        email: session?.user?.email,
        name: session?.user?.name,
      });
    }
    return apiCommunities;
  }, [
    apiCommunities,
    isCommunitiesLoading,
    isCommunitiesError,
    session?.user?.email,
    session?.user?.name,
  ]);
  const { data: feed, isLoading: isFeedLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const r = await fetch('/api/feed');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const r = await fetch('/api/events');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const { data: classroom } = useQuery({
    queryKey: ['classroom'],
    queryFn: async () => {
      const r = await fetch('/api/classroom');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const r = await fetch('/api/leaderboard');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: communitySubTab === 'leaderboard',
  });
  const { data: referral } = useQuery({
    queryKey: ['referral'],
    queryFn: async () => {
      const r = await fetch('/api/referrals');
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!session,
  });

  const joinMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'join' | 'leave' }) => {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_id: id, action }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communities'] }),
  });

  useEffect(() => {
    if (!session || !(communities as any[]).length) return;
    const main = (communities as any[]).find((c: any) => c.slug === 'nordic-creator');
    if (main && !main.is_joined) joinMutation.mutate({ id: main.id, action: 'join' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, communities]);

  useEffect(() => {
    if (!mounted || !events?.length) return;
    const tick = () => {
      const now = window.performance.timeOrigin + window.performance.now();
      const next: CountdownMap = {};
      events.forEach((ev: any) => {
        const diff = parseISO(ev.start_time).getTime() - now;
        if (diff <= 0) {
          next[ev.id] = 'LIVE NU 🔴';
          return;
        }
        const d = Math.floor(diff / 86400000),
          h = Math.floor((diff % 86400000) / 3600000),
          m = Math.floor((diff % 3600000) / 60000),
          s = Math.floor((diff % 60000) / 1000);
        next[ev.id] =
          `${String(d).padStart(2, '0')}d : ${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`;
      });
      setCountdown(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [events, mounted]);

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPost,
          tag: postTag?.replace('#', '') ?? null,
          image_url: postImage || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setNewPost('');
      setPostTag(null);
      setPostImage('');
      setShowImage(false);
    },
  });
  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });
      return res.json();
    },
    onMutate: (postId) => {
      setLikedPosts((prev) => {
        const n = new Set(prev);
        n.has(postId) ? n.delete(postId) : n.add(postId);
        return n;
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  const pinPostMutation = useMutation({
    mutationFn: async ({
      post_id,
      action,
    }: {
      post_id: number;
      action: 'pin' | 'unpin';
    }) => {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, post_id }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_res, vars) => {
      queryClient.setQueryData(['feed'], (prev: unknown) => {
        if (!Array.isArray(prev)) return prev;
        return prev
          .map((p: any) =>
            p.id === vars.post_id
              ? {
                  ...p,
                  is_pinned: vars.action === 'pin',
                  pinned_at:
                    vars.action === 'pin' ? new Date().toISOString() : null,
                }
              : p
          )
          .sort((a: any, b: any) => {
            const ap = a.is_pinned ? 1 : 0;
            const bp = b.is_pinned ? 1 : 0;
            if (ap !== bp) return bp - ap;
            return (
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
      });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const sortedFeed = useMemo(() => {
    if (!Array.isArray(feed)) return [];
    return [...feed].sort((a: any, b: any) => {
      const ap = a.is_pinned ? 1 : 0;
      const bp = b.is_pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [feed]);
  const rsvpMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });
      return res.json();
    },
    onMutate: (id) => {
      setRsvpdEvents((p) => {
        const n = new Set(p);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const formatDate = (d: string) => {
    if (!mounted || !d) return '—';
    try {
      return format(parseISO(d), 'dd MMM · HH:mm');
    } catch {
      return '—';
    }
  };
  const formatEventDate = (d: string) => {
    if (!mounted || !d) return '—';
    try {
      return format(parseISO(d), "EEEE d MMMM 'kl.' HH:mm");
    } catch {
      return '—';
    }
  };

  const sendMemberChat = async () => {
    if (!memberChatInput.trim() || memberChatLoading) return;
    const userMsg = { role: 'user', content: memberChatInput };
    setMemberChatMessages((prev) => [...prev, userMsg]);
    setMemberChatInput('');
    setMemberChatLoading(true);
    setMemberStreamingMsg('');
    const lessonContext = normalizeClassroomCourses(classroom)
      .flatMap((c) =>
        (c.lessons ?? []).map((l) => `[${l.id}] ${l.title} (Course: ${c.title})`)
      )
      .join('\n');
    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...memberChatMessages, userMsg], lessonContext }),
      });
      if (!response.ok) throw new Error('AI request failed');
      handleMemberChatStream(response);
    } catch (err) {
      console.error(err);
      setMemberChatLoading(false);
    }
  };

  const renderChatMessage = (content: string) => {
    const parts = content.split(/(\[LESSON:\d+:[^\]]+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[LESSON:(\d+):([^\]]+)\]/);
      if (match) {
        const lessonId = parseInt(match[1]);
        const lessonTitle = match[2];
        const course = normalizeClassroomCourses(classroom).find((c) =>
          c.lessons?.some((l) => l.id === lessonId)
        );
        return (
          <button
            key={i}
            onClick={() => {
              setShowMemberChat(false);
              setSidebarView('community');
              setActiveTab('classroom');
              if (course) {
                router.push(`/classroom?course=${course.id}`);
              }
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-200 transition-colors mx-0.5 underline underline-offset-2"
          >
            <PlayCircle size={10} /> {lessonTitle}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const joinedCommunities = communities.filter((c) => c.is_joined);
  const filteredCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c) => {
      const haystack = [c.name, c.category, c.creator_name, c.slug, c.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [communities, communitySearch]);

  const handleSelectCommunitySearch = (community: SearchableCommunity) => {
    setMobileCommunitiesOpen(false);
    router.push(`/communities/${community.id}?from=dashboard`);
  };

  if (isAuthPending)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white ">
        <div className="text-zinc-400">Authenticating…</div>
      </div>
    );
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  if (liveEvent)
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col ">
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--nc-coral)] border-b border-zinc-800">
          <button
            onClick={() => setLiveEvent(null)}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-sm font-black">{liveEvent.title}</h2>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 bg-red-500 rounded-full"
                style={{ animation: 'livePulse 1s ease-in-out infinite' }}
              />
              <span className="text-xs text-red-400 font-bold">LIVE</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <div className="flex-1 bg-black">
            <div className="aspect-video w-full">
              <iframe
                src={liveEvent.stream_url?.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-black">{liveEvent.title}</h3>
              <p className="text-sm text-zinc-400 mt-1">{liveEvent.description}</p>
            </div>
          </div>
          <div className="w-full lg:w-80 bg-[var(--nc-coral)] flex flex-col border-l border-zinc-800">
            <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
              <Radio size={14} className="text-red-400" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                Live Chat
              </span>
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {['Emma L.', 'Marcus B.', 'Astrid K.'].map((name, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                    {name[0]}
                  </div>
                  <div>
                    <span className="text-xs font-black text-blue-400">{name}: </span>
                    <span className="text-xs text-zinc-300">Fantastiskt content! 🔥</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-zinc-800 flex gap-2">
              <Input
                placeholder="Skriv ett meddelande..."
                className="flex-1 h-9 rounded-lg bg-zinc-800 border-zinc-700 text-white text-xs placeholder:text-zinc-500"
              />
              <button className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>
        <style jsx global>{`
          @keyframes livePulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.3;
            }
          }
        `}</style>
      </div>
    );

  const MAIN_TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'community', label: 'Community', icon: MessageSquare },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'classroom', label: 'Classroom', icon: GraduationCap },
    { key: 'store', label: 'Store', icon: ShoppingBag },
  ];

  // ── Sidebar icon item ────────────────────────────────────────────────────
  const SidebarIcon = ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`group relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${
        active
          ? 'bg-[var(--nc-coral)] text-white shadow-sm'
          : 'text-[#94a0b0] hover:bg-white/70 hover:text-[#2c3340]'
      }`}
    >
      <Icon size={18} />
      <span className="absolute left-full ml-3 px-2.5 py-1 nc-glass text-[#2c3340] text-xs font-bold rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {label}
      </span>
    </button>
  );

  // ── Platform Home View ───────────────────────────────────────────────────
  const renderPlatformHome = () => (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#2c3340]">
          {t('hi', locale)}, {session.user.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-zinc-500 text-sm mt-1">{t('dashboardSub', locale)}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: t('joined', locale),
            value: joinedCommunities.length,
            sub: 'communities',
            color: '#3B82F6',
          },
          {
            label: t('posts', locale),
            value: (feed as any[])?.length ?? 0,
            sub: t('inFeed', locale),
            color: '#10B981',
          },
          {
            label: t('eventsAndWebinars', locale).split(' ')[0] || 'Events',
            value: (events as any[])?.length ?? 0,
            sub: t('upcoming', locale),
            color: '#8B5CF6',
          },
          {
            label: t('courses', locale),
            value: (classroom as any[])?.length ?? 0,
            sub: t('available', locale),
            color: '#F59E0B',
          },
        ].map((s) => (
          <div key={s.label} className="nc-glass rounded-[1.5rem] p-4">
            <p className="text-2xl font-black text-[#2c3340]">{s.value}</p>
            <p
              className="text-xs font-black uppercase tracking-wider mt-0.5"
              style={{ color: s.color }}
            >
              {s.label}
            </p>
            <p className="text-[10px] text-zinc-400 font-medium">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="mb-8">
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">
          {t('myCommunities', locale)}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {joinedCommunities.map((c: any) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCommunity(c);
                setSidebarView('community');
                setActiveTab('community');
              }}
              className="group flex items-center gap-4 p-4 nc-glass rounded-[1.5rem] hover:shadow-md hover:border-zinc-200 transition-all text-left"
            >
              <div
                className="w-12 h-12 rounded-xl overflow-hidden border-2 border-zinc-100 flex-shrink-0"
                style={{ background: c.cover_color ?? '#1e1b4b' }}
              >
                {c.creator_image ? (
                  <img src={c.creator_image} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-black">
                    {c.name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#2c3340] truncate group-hover:text-[var(--nc-coral)] transition-colors">
                  {c.name}
                </p>
                <p className="text-xs text-zinc-400 font-medium">
                  {c.category} · {c.member_count.toLocaleString('sv-SE')} members
                </p>
              </div>
              <ChevronRight
                size={14}
                className="text-zinc-300 group-hover:text-indigo-400 transition-colors flex-shrink-0"
              />
            </button>
          ))}
          <button
            onClick={() => setSidebarView('search')}
            className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-200 flex items-center justify-center group-hover:bg-zinc-300 transition-colors">
              <Plus size={20} className="text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-500 group-hover:text-zinc-700">
                {t('findMore', locale)}
              </p>
              <p className="text-xs text-zinc-400">Utforska plattformen</p>
            </div>
          </button>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">
          {t('latestFromCommunities', locale)}
        </h2>
        {isFeedLoading ? (
          <div className="text-center py-12 text-zinc-400 text-sm">Laddar feed...</div>
        ) : (
          <div className="space-y-4">
            {sortedFeed.slice(0, 5).map((post: any) => {
              const isLiked = likedPosts.has(post.id);
              const ts = tagStyle(post.tag);
              const isExpanded = expandedPosts.has(post.id);
              return (
                <div
                  key={post.id}
                  className={`nc-glass rounded-[1.5rem] p-5 ${
                    post.is_pinned ? 'ring-1 ring-[#ffe0d4]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <LevelAvatar
                      name={post.user_name}
                      image={post.user_image}
                      points={0}
                      size={36}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-[#2c3340]">{post.user_name}</p>
                        {post.is_pinned && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--nc-coral)] bg-[#f2eeff] px-1.5 py-0.5 rounded-full">
                            <Pin size={9} /> Fäst
                          </span>
                        )}
                        {post.tag && (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${ts.color}`}
                          >
                            <span className="w-1 h-1 rounded-full" style={{ background: ts.dot }} />
                            {post.tag}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-300 bg-zinc-50 px-2 py-0.5 rounded-full font-bold">
                          Nordic Creator
                        </span>
                      </div>
                      <p
                        className="text-[10px] text-zinc-400 font-semibold"
                        suppressHydrationWarning
                      >
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap mb-3">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-1 pt-3 border-t border-zinc-50 flex-wrap">
                    <button
                      onClick={() => likeMutation.mutate(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${isLiked ? 'bg-red-50 text-red-500' : 'text-zinc-400 hover:bg-zinc-50 hover:text-red-400'}`}
                    >
                      <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                      {Number(post.like_count) + (isLiked ? 1 : 0)}
                    </button>
                    <button
                      onClick={() =>
                        setExpandedPosts((prev) => {
                          const n = new Set(prev);
                          n.has(post.id) ? n.delete(post.id) : n.add(post.id);
                          return n;
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:bg-zinc-50 hover:text-blue-400 transition-all min-h-[44px]"
                    >
                      <MessageSquare size={14} />
                      {post.comment_count}
                    </button>
                    <button
                      type="button"
                      disabled={pinPostMutation.isPending}
                      onClick={() =>
                        pinPostMutation.mutate({
                          post_id: post.id,
                          action: post.is_pinned ? 'unpin' : 'pin',
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] disabled:opacity-50 ${
                        post.is_pinned
                          ? 'text-[var(--nc-coral)] bg-[#f2eeff] hover:bg-[#f2eeff]'
                          : 'text-zinc-400 hover:bg-zinc-50 hover:text-[var(--nc-coral)]'
                      }`}
                    >
                      <Pin size={14} />
                      {post.is_pinned ? 'Ta bort fästning' : 'Fäst'}
                    </button>
                    <button
                      onClick={() => {
                        const nc = (communities as any[]).find((c) => c.slug === 'nordic-creator');
                        if (nc) {
                          setSelectedCommunity(nc);
                          setSidebarView('community');
                        }
                      }}
                      className="ml-auto flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-[var(--nc-coral)] transition-colors min-h-[44px]"
                    >
                      {t('openCommunity', locale)} <ChevronRight size={12} />
                    </button>
                  </div>
                  {isExpanded && <CommentsSection postId={post.id} session={session} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Search View ──────────────────────────────────────────────────────────
  const renderSearch = () => (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-black text-[#2c3340] mb-2">{t('searchCommunities', locale)}</h1>
      <p className="text-zinc-500 text-sm mb-6">{t('searchCommSub', locale)}</p>
      <div className="relative z-20 mb-6 max-w-xl">
        <CommunitySearchAutocomplete
          value={communitySearch}
          onChange={setCommunitySearch}
          communities={communities}
          onSelectCommunity={handleSelectCommunitySearch}
          isLoading={isCommunitiesLoading && !apiCommunities}
          placeholder={t('searchPlaceholder', locale)}
        />
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
          {filteredCommunities.length}
        </span>
        {communitySearch && (
          <button
            type="button"
            onClick={() => setCommunitySearch('')}
            className="text-xs font-bold text-zinc-600 hover:text-[#2c3340] transition-colors min-h-11 px-2"
          >
            {t('clearFilter', locale)}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCommunities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => router.push(`/communities/${c.id}?from=dashboard`)}
            className="nc-glass rounded-[1.5rem] overflow-hidden hover:shadow-md transition-all text-left w-full"
          >
            <div
              className="h-20 relative"
              style={{
                background: `linear-gradient(135deg, ${c.cover_color ?? '#1e1b4b'}, #0a0a0f)`,
              }}
            >
              <div className="absolute top-3 left-3">
                <span className="text-[10px] font-black text-white/70 bg-white/10 backdrop-blur px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {c.category}
                </span>
              </div>
              <div className="absolute -bottom-4 left-3">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm"
                  style={{ background: c.cover_color ?? '#1e1b4b' }}
                >
                  {c.creator_image ? (
                    <img
                      src={c.creator_image}
                      alt={c.creator_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-black text-sm">
                      {c.name[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-6 p-4">
              <p className="text-[10px] font-bold text-zinc-400 mb-0.5">{c.creator_name}</p>
              <h3 className="text-sm font-black text-[#2c3340] mb-1">{c.name}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-3">
                {c.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-zinc-400">
                  <Users size={11} />
                  <span className="text-xs font-bold">
                    {c.member_count.toLocaleString('sv-SE')}
                  </span>
                </div>
                <span className="flex items-center gap-1 h-7 px-3 rounded-full bg-[var(--nc-coral)] text-white text-xs font-black">
                  {c.is_joined ? 'Öppna about' : 'Kika in'} <ChevronRight size={10} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {filteredCommunities.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 font-bold">
            {t('noResults', locale)} &quot;{communitySearch}&quot;
          </p>
          <button
            type="button"
            onClick={() => setCommunitySearch('')}
            className="mt-3 text-sm text-[#2c3340] font-bold hover:underline min-h-11"
          >
            {t('showAll', locale)}
          </button>
        </div>
      )}
    </div>
  );

  // ── Profile View ─────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-black text-[#2c3340] mb-6">{t('profileAndSettings', locale)}</h1>
      <div className="nc-glass rounded-[1.5rem] p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <LevelAvatar name={session.user.name} image={session.user.image} points={0} size={56} />
          <div>
            <p className="text-lg font-black text-[#2c3340]">{session.user.name}</p>
            <p className="text-sm text-zinc-500">{session.user.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Medal size={12} style={{ color: LEVELS[0].color }} />
              <span className="text-xs font-black" style={{ color: LEVELS[0].color }}>
                {t('levelBronze', locale)}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Communities', val: joinedCommunities.length },
            { label: 'Inlägg', val: 0 },
            { label: 'Poäng', val: 0 },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-[#2c3340]">{s.val}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/') } })
          }
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-colors"
        >
          <LogOut size={14} /> {t('signOut', locale)}
        </button>
      </div>
      {referral && (
        <div className="nc-glass rounded-[1.5rem] p-6">
          <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Gift size={13} className="text-green-500" /> Ref &amp; Earn
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Inbjudna', val: referral.total_invites },
              { label: 'SEK intjänat', val: Number(referral.earned_commission_sek).toFixed(0) },
              { label: 'Bonus XP', val: referral.bonus_xp },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-[#2c3340]">{s.val}</p>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide leading-tight mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 flex items-center gap-1.5 min-w-0">
              <LinkIcon size={10} className="text-zinc-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-zinc-600 truncate">
                creator.app/join?ref={referral.referral_code}
              </span>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `${window.location.origin}?ref=${referral.referral_code}`
                );
                setRefLinkCopied(true);
                setTimeout(() => setRefLinkCopied(false), 2200);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${refLinkCopied ? 'bg-green-100 text-green-600' : 'bg-[var(--nc-coral)] text-white hover:opacity-90'}`}
            >
              {refLinkCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Community View ───────────────────────────────────────────────────────
  const renderCommunity = () => {
    const comm = selectedCommunity;
    const joinedForSelect = (communities as any[]).filter((c: any) => c.is_joined);
    return (
      <div>
        {/* Skool-style top bar */}
        <div className="bg-white/95 backdrop-blur-md border-b border-zinc-100 sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-3 sm:px-6">
            <div className="h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
              {/* Left: logo + community selector */}
              <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-black"
                  style={{ background: comm?.cover_color ?? '#1e1b4b' }}
                >
                  {comm?.creator_image ? (
                    <img
                      src={comm.creator_image}
                      alt={comm?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    comm?.name?.[0]
                  )}
                </div>
                <div className="relative min-w-0">
                  <select
                    value={comm?.id ?? ''}
                    onChange={(e) => {
                      const next = (communities as any[]).find(
                        (c: any) => String(c.id) === e.target.value
                      );
                      if (next) setSelectedCommunity(next);
                    }}
                    className="appearance-none h-11 min-h-[44px] max-w-[130px] sm:max-w-[220px] pl-1.5 pr-6 bg-transparent text-sm font-black text-[#2c3340] truncate focus:outline-none cursor-pointer"
                    aria-label={t('chooseCommunity', locale)}
                  >
                    {(joinedForSelect.length ? joinedForSelect : [comm].filter(Boolean)).map(
                      (c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      )
                    )}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                </div>
              </div>

              {/* Center search */}
              <div className="flex-1 flex justify-center min-w-0">
                <div className="relative w-full max-w-md">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                    placeholder={t('searchCommPlaceholder', locale)}
                    className="w-full h-11 min-h-[44px] rounded-full bg-zinc-100 border border-transparent focus:border-zinc-200 focus:bg-white pl-10 pr-4 text-sm font-medium text-[#2c3340] placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Right: notifications + avatar */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 relative"
                  aria-label="Notiser"
                >
                  <Bell size={16} />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--nc-coral)]" />
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarView('profile')}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full overflow-hidden border-2 border-white shadow-sm bg-[var(--nc-coral)] flex items-center justify-center text-white text-xs font-black"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    session.user.name?.[0]
                  )}
                </button>
              </div>
            </div>

            {/* Sub-menu tabs with underline */}
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none -mb-px">
              {MAIN_TABS.map(({ key, label, icon: Icon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`relative flex items-center gap-1.5 h-11 min-h-[44px] px-3.5 text-xs font-extrabold whitespace-nowrap transition-colors flex-shrink-0 ${
                      active ? 'text-[#2c3340]' : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                    {active && (
                      <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-[#2c3340]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-6">
            {activeTab === 'community' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-1 bg-white border border-zinc-100 shadow-sm p-1 rounded-2xl w-fit">
                    {(
                      [
                        { key: 'feed', label: 'Feed', icon: MessageSquare },
                        { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
                      ] as const
                    ).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setCommunitySubTab(key as CommunitySubTab)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${communitySubTab === key ? 'bg-[var(--nc-coral)] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
                      >
                        <Icon size={13} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {communitySubTab === 'feed' && (
                    <>
                      <div className="nc-glass rounded-[1.5rem] overflow-hidden">
                        <div className="p-5">
                          <div className="flex gap-3">
                            <LevelAvatar
                              name={session.user.name}
                              image={session.user.image}
                              points={0}
                              size={38}
                            />
                            <div className="flex-1 space-y-3">
                              <Textarea
                                placeholder={t('communityPlaceholder', locale)}
                                className="min-h-[90px] bg-zinc-50 border-zinc-100 resize-none rounded-xl text-sm focus:border-blue-200 focus:ring-blue-100"
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                              />
                              {showImage && (
                                <div className="flex gap-2 items-center">
                                  <Input
                                    placeholder="Klistra in bild-URL..."
                                    value={postImage}
                                    onChange={(e) => setPostImage(e.target.value)}
                                    className="flex-1 h-9 rounded-xl bg-zinc-50 border-zinc-100 text-xs"
                                  />
                                  {postImage && (
                                    <img
                                      src={postImage}
                                      alt="preview"
                                      className="w-9 h-9 rounded-lg object-cover border border-zinc-200"
                                      onError={(e) => ((e.target as HTMLImageElement).src = '')}
                                    />
                                  )}
                                  <button
                                    onClick={() => {
                                      setShowImage(false);
                                      setPostImage('');
                                    }}
                                    className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 flex-shrink-0"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {TAGS.map((t) => (
                                  <button
                                    key={t.label}
                                    onClick={() => setPostTag(postTag === t.label ? null : t.label)}
                                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${postTag === t.label ? `${t.color} border-current scale-[1.04] shadow-sm` : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300'}`}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{
                                        background: postTag === t.label ? t.dot : '#D1D5DB',
                                      }}
                                    />
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-t border-zinc-100">
                          <button
                            onClick={() => setShowImage(!showImage)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showImage ? 'bg-blue-100 text-blue-600' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
                          >
                            <ImageIcon size={13} /> Bild
                          </button>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-300 font-medium tabular-nums">
                              {newPost.length}/500
                            </span>
                            <Button
                              size="sm"
                              onClick={() => createPostMutation.mutate()}
                              disabled={!newPost.trim() || createPostMutation.isPending}
                              className="rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white font-bold h-9 px-5 flex items-center gap-2"
                            >
                              <Send size={12} />
                              {createPostMutation.isPending ? 'Publicerar...' : 'Publicera'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isFeedLoading ? (
                        <div className="text-center py-16 text-zinc-400 text-sm">
                          Laddar feed...
                        </div>
                      ) : (
                        sortedFeed.map((post: any) => {
                          const isLiked = likedPosts.has(post.id);
                          const isExpanded = expandedPosts.has(post.id);
                          const ts = tagStyle(post.tag);
                          return (
                            <div
                              key={post.id}
                              className={`nc-glass rounded-[1.5rem] overflow-hidden ${
                                post.is_pinned ? 'ring-1 ring-[#ffe0d4]' : ''
                              }`}
                            >
                              <div className="p-5">
                                <div className="flex items-center gap-3 mb-3">
                                  <LevelAvatar
                                    name={post.user_name}
                                    image={post.user_image}
                                    points={0}
                                    size={40}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-black text-[#2c3340]">
                                        {post.user_name}
                                      </p>
                                      {post.is_pinned && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--nc-coral)] bg-[#f2eeff] px-1.5 py-0.5 rounded-full">
                                          <Pin size={9} /> Fäst
                                        </span>
                                      )}
                                      {post.tag && (
                                        <span
                                          className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${ts.color}`}
                                        >
                                          <span
                                            className="w-1 h-1 rounded-full"
                                            style={{ background: ts.dot }}
                                          />
                                          {post.tag}
                                        </span>
                                      )}
                                    </div>
                                    <p
                                      className="text-[10px] text-zinc-400 font-semibold"
                                      suppressHydrationWarning
                                    >
                                      {formatDate(post.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap mb-3">
                                  {post.content}
                                </p>
                                {post.image_url && (
                                  <div className="rounded-xl overflow-hidden mb-3 border border-zinc-100">
                                    <img
                                      src={post.image_url}
                                      alt="Post"
                                      className="w-full max-h-64 object-cover"
                                      onError={(e) =>
                                        ((e.target as HTMLElement).style.display = 'none')
                                      }
                                    />
                                  </div>
                                )}
                                <div className="flex items-center gap-1 pt-3 border-t border-zinc-50 flex-wrap">
                                  <button
                                    onClick={() => likeMutation.mutate(post.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${isLiked ? 'bg-red-50 text-red-500' : 'text-zinc-400 hover:bg-zinc-50 hover:text-red-400'}`}
                                  >
                                    <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                                    {Number(post.like_count) + (isLiked ? 1 : 0)}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setExpandedPosts((prev) => {
                                        const n = new Set(prev);
                                        n.has(post.id) ? n.delete(post.id) : n.add(post.id);
                                        return n;
                                      })
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${isExpanded ? 'bg-blue-50 text-blue-600' : 'text-zinc-400 hover:bg-zinc-50 hover:text-blue-400'}`}
                                  >
                                    <MessageSquare size={14} />
                                    {post.comment_count}{' '}
                                    {post.comment_count === 1 ? 'kommentar' : 'kommentarer'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pinPostMutation.isPending}
                                    onClick={() =>
                                      pinPostMutation.mutate({
                                        post_id: post.id,
                                        action: post.is_pinned ? 'unpin' : 'pin',
                                      })
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] disabled:opacity-50 ${
                                      post.is_pinned
                                        ? 'text-[var(--nc-coral)] bg-[#f2eeff] hover:bg-[#f2eeff]'
                                        : 'text-zinc-400 hover:bg-zinc-50 hover:text-[var(--nc-coral)]'
                                    }`}
                                  >
                                    <Pin size={14} />
                                    {post.is_pinned ? 'Ta bort fästning' : 'Fäst'}
                                  </button>
                                  {Number(post.like_count) >= 3 && (
                                    <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-orange-400 bg-orange-50 px-2 py-1 rounded-lg">
                                      <Flame size={11} /> Populär
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="px-5 pb-5">
                                  <CommentsSection postId={post.id} session={session} />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {communitySubTab === 'leaderboard' && (
                    <div className="space-y-4">
                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                          background:
                            'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                        }}
                      >
                        <div className="px-6 py-6 text-white">
                          <h2 className="text-2xl font-black mb-1">🏆 Leaderboard</h2>
                          <p className="text-sm text-white/70">Toppmedlemmar rankas efter poäng</p>
                        </div>
                      </div>
                      <div className="nc-glass rounded-[1.5rem] overflow-hidden divide-y divide-zinc-50">
                        {leaderboard?.map((member: any, idx: number) => {
                          const lvl = getLevel(member.points);
                          const LIcon = lvl.icon;
                          const isMe = member.id === session.user.id;
                          return (
                            <div
                              key={member.id}
                              className={`flex items-center gap-4 px-5 py-3.5 ${isMe ? 'bg-blue-50/60' : 'hover:bg-zinc-50/50'}`}
                            >
                              <div className="w-8 text-center">
                                {idx < 3 ? (
                                  ['🥇', '🥈', '🥉'][idx]
                                ) : (
                                  <span className="text-sm font-black text-zinc-400">
                                    {idx + 1}
                                  </span>
                                )}
                              </div>
                              <LevelAvatar
                                name={member.name}
                                image={member.image}
                                points={member.points}
                                size={36}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-[#2c3340] truncate">
                                    {member.name}
                                  </p>
                                  {isMe && (
                                    <span className="text-[9px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                                      DU
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <LIcon size={10} style={{ color: lvl.color }} />
                                  <span
                                    className="text-[10px] font-black"
                                    style={{ color: lvl.color }}
                                  >
                                    {lvl.label}
                                  </span>
                                </div>
                              </div>
                              <p className="text-lg font-black text-[#2c3340]">{member.points}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="nc-glass rounded-[1.5rem] p-5">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
                      Din profil
                    </h3>
                    <div className="flex items-center gap-3 mb-4">
                      <LevelAvatar
                        name={session.user.name}
                        image={session.user.image}
                        points={0}
                        size={48}
                      />
                      <div>
                        <p className="text-sm font-black text-[#2c3340]">{session.user.name}</p>
                        <p className="text-xs font-black" style={{ color: LEVELS[0].color }}>
                          {t('levelBronze', locale)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Inlägg', val: '0' },
                        { label: 'Likes', val: '0' },
                        { label: 'Poäng', val: '0' },
                      ].map((s) => (
                        <div key={s.label} className="bg-zinc-50 rounded-xl p-2">
                          <p className="text-base font-black text-[#2c3340]">{s.val}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="nc-glass rounded-[1.5rem] p-5">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">
                      Regler
                    </h3>
                    {[
                      'Var respektfull 🤝',
                      'Ingen spam',
                      'Svenska / Engelska',
                      'Hjälp varandra',
                    ].map((r) => (
                      <div key={r} className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <div className="w-1 h-1 bg-blue-400 rounded-full" />
                        {r}
                      </div>
                    ))}
                  </div>
                  <div className="nc-glass rounded-[1.5rem] p-5">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Gift size={11} className="text-green-500" /> Ref &amp; Earn
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 flex items-center gap-1.5 min-w-0">
                        <LinkIcon size={10} className="text-zinc-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-zinc-600 truncate">
                          {referral
                            ? `creator.app/join?ref=${referral.referral_code}`
                            : 'Genererar länk...'}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!referral) return;
                          await navigator.clipboard.writeText(
                            `${window.location.origin}?ref=${referral.referral_code}`
                          );
                          setRefLinkCopied(true);
                          setTimeout(() => setRefLinkCopied(false), 2200);
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${refLinkCopied ? 'bg-green-100 text-green-600' : 'bg-[var(--nc-coral)] text-white hover:opacity-90'}`}
                      >
                        {refLinkCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-[#2c3340]">Upcoming Events</h2>
                  <Link
                    href="/events"
                    className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white text-xs font-black transition-all"
                  >
                    <Calendar size={13} /> Alla Events
                  </Link>
                </div>
                {isEventsLoading ? (
                  <div className="text-center py-16 text-zinc-400 text-sm">Laddar events...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {events?.map((event: any) => {
                      const isLive = countdown[event.id] === 'LIVE NU 🔴';
                      const hasRsvpd = rsvpdEvents.has(event.id);
                      return (
                        <div
                          key={event.id}
                          className="nc-glass rounded-[1.5rem] overflow-hidden hover:shadow-lg transition-all"
                        >
                          <div
                            className={`h-44 relative flex items-center justify-center ${isLive ? 'bg-red-950' : 'bg-gradient-to-br from-indigo-950 to-zinc-900'}`}
                          >
                            <Calendar size={48} className="text-white/20" strokeWidth={1} />
                            <div className="absolute top-3 left-3">
                              {isLive ? (
                                <span className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE NU
                                </span>
                              ) : (
                                <span className="bg-white/10 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                                  LIVE STREAM
                                </span>
                              )}
                            </div>
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                              <div className="bg-black/60 backdrop-blur text-white text-xs font-black px-4 py-2 rounded-full">
                                {mounted ? (countdown[event.id] ?? '—') : '—'}
                              </div>
                            </div>
                          </div>
                          <div className="p-5">
                            <p
                              className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1"
                              suppressHydrationWarning
                            >
                              {formatEventDate(event.start_time)}
                            </p>
                            <h3 className="text-base font-black text-[#2c3340] leading-snug mb-2">
                              {event.title}
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                              {event.description}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => rsvpMutation.mutate(event.id)}
                                className={`flex-1 h-10 rounded-xl text-xs font-black transition-all active:scale-95 ${hasRsvpd ? 'bg-green-100 text-green-700' : 'bg-[var(--nc-coral)] text-white shadow-sm'}`}
                              >
                                {hasRsvpd ? `✓ ${t('rsvpConfirmed', locale)}` : t('rsvp', locale)}
                              </button>
                              {isLive && (
                                <button
                                  onClick={() => setLiveEvent(event)}
                                  className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Radio size={12} /> {t('joinLive', locale)}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'store' && (
              <StoreView
                communityId={comm?.id != null ? Number(comm.id) : null}
                communityName={comm?.name ?? null}
              />
            )}

            {activeTab === 'classroom' && (
              <div>
                <ClassroomView
                  communityId={comm?.id != null ? Number(comm.id) : null}
                  communitySlug={comm?.slug ?? null}
                  communityName={comm?.name ?? null}
                />

                <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
                  {showMemberChat && (
                    <div
                      className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
                      style={{ height: 490 }}
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-[var(--nc-coral)] flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                            <Sparkles size={14} className="text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">AI Course Assistant</p>
                            <p className="text-[10px] text-white/70">
                              Ask anything about your lessons
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowMemberChat(false)}
                          className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                      <div ref={memberChatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {memberChatMessages.length === 0 && (
                          <div className="text-center py-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                              <GraduationCap size={22} className="text-blue-400" />
                            </div>
                            <p className="text-xs font-black text-zinc-600">
                              Hi! I&apos;m your AI course assistant.
                            </p>
                            <p className="text-xs text-zinc-400 mt-1 mb-3">
                              Ask me anything about your lessons!
                            </p>
                          </div>
                        )}
                        {memberChatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-100 text-zinc-700 rounded-bl-none'}`}
                            >
                              {msg.role === 'assistant'
                                ? renderChatMessage(msg.content)
                                : msg.content}
                            </div>
                          </div>
                        ))}
                        {memberStreamingMsg && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-zinc-100 text-zinc-700 rounded-2xl rounded-bl-none px-3 py-2.5 text-xs leading-relaxed">
                              {renderChatMessage(memberStreamingMsg)}
                            </div>
                          </div>
                        )}
                        {memberChatLoading && !memberStreamingMsg && (
                          <div className="flex justify-start">
                            <div className="bg-zinc-100 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5 items-center">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
                                  style={{
                                    animation: `memberChatPulse 1s ease-in-out infinite`,
                                    animationDelay: `${i * 0.2}s`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-zinc-100 flex gap-2 flex-shrink-0">
                        <input
                          type="text"
                          placeholder="Ask about your lessons..."
                          value={memberChatInput}
                          onChange={(e) => setMemberChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMemberChat();
                            }
                          }}
                          className="flex-1 text-xs bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-300"
                        />
                        <button
                          onClick={sendMemberChat}
                          disabled={!memberChatInput.trim() || memberChatLoading}
                          className="w-9 h-9 flex-shrink-0 rounded-xl bg-blue-600 flex items-center justify-center disabled:opacity-40 hover:bg-blue-700"
                        >
                          <Send size={13} className="text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowMemberChat((v) => !v)}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b8a9ff] to-[#9b8afb] shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}
                  >
                    {showMemberChat ? (
                      <X size={22} className="text-white" />
                    ) : (
                      <Sparkles size={22} className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="nc-app nc-app-shell flex min-h-screen">
      {/* Left Sidebar (desktop) — soft glass */}
      <aside className="hidden lg:flex flex-col items-center w-[4.5rem] nc-glass fixed left-3 top-3 bottom-3 z-30 py-4 gap-2 rounded-[1.75rem]">
        <Link
          href="/"
          className="w-10 h-10 rounded-full bg-[var(--nc-coral)] flex items-center justify-center mb-3 shadow-sm hover:opacity-90 transition-opacity"
        >
          <span className="text-white font-display font-extrabold text-xs">N</span>
        </Link>
        <SidebarIcon
          icon={Home}
          label={t('dashboard', locale)}
          active={sidebarView === 'home'}
          onClick={() => {
            setSidebarView('home');
            setSelectedCommunity(null);
          }}
        />
        <SidebarIcon
          icon={Search}
          label={t('searchCommunities', locale)}
          active={sidebarView === 'search'}
          onClick={() => setSidebarView('search')}
        />
        <SidebarIcon
          icon={User}
          label={t('profileAndSettings', locale)}
          active={sidebarView === 'profile'}
          onClick={() => setSidebarView('profile')}
        />
        {joinedCommunities.length > 0 && (
          <>
            <div className="w-8 h-px bg-[#e8ecf2] my-1" />
            <p className="text-[8px] font-extrabold text-[#94a0b0] uppercase tracking-widest mb-1">
              {t('mineLabel', locale)}
            </p>
          </>
        )}
        <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto w-full px-3">
          {joinedCommunities.map((c: any) => {
            const isActive = selectedCommunity?.id === c.id && sidebarView === 'community';
            return (
              <button
                key={c.id}
                title={c.name}
                onClick={() => {
                  setSelectedCommunity(c);
                  setSidebarView('community');
                  setActiveTab('community');
                }}
                className={`relative w-10 h-10 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all hover:scale-105 ${isActive ? 'border-[var(--nc-coral)] shadow-md' : 'border-transparent hover:border-[#e8e2ff]'}`}
                style={{ background: c.cover_color ?? '#e8e2ff' }}
              >
                {c.creator_image ? (
                  <img src={c.creator_image} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-extrabold text-sm">
                    {c.name[0]}
                  </div>
                )}
                {isActive && (
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--nc-coral)] rounded-r-full" />
                )}
              </button>
            );
          })}
          <button
            title={t('findMore', locale)}
            onClick={() => setSidebarView('search')}
            className="w-10 h-10 rounded-2xl border-2 border-dashed border-[#d5dce8] flex items-center justify-center text-[#94a0b0] hover:text-[var(--nc-coral)] hover:border-[var(--nc-coral)] transition-all flex-shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={() =>
            authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/') } })
          }
          title={t('signOut', locale)}
          className="w-10 h-10 rounded-2xl text-[#94a0b0] hover:text-[#2c3340] hover:bg-white/70 flex items-center justify-center transition-colors mt-2"
        >
          <LogOut size={16} />
        </button>
      </aside>

      {/* Main area */}
      <div className="relative z-10 flex-1 lg:ml-[5.25rem] flex flex-col min-h-screen">
        <main className="flex-1 relative z-10 pt-3 lg:pt-4">
          {sidebarView === 'home' && renderPlatformHome()}
          {sidebarView === 'search' && renderSearch()}
          {sidebarView === 'profile' && renderProfile()}
          {sidebarView === 'community' && selectedCommunity && renderCommunity()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-3 left-3 right-3 lg:hidden z-20">
        <div className="nc-glass rounded-full flex items-center justify-around h-14 px-2">
          {[
            { view: 'home' as SidebarView, icon: Home, label: t('home', locale) },
            { view: 'search' as SidebarView, icon: Search, label: t('search', locale) },
            {
              view: 'community' as SidebarView,
              icon: Users,
              label: t('allCommunities', locale),
              action: () => setMobileCommunitiesOpen(!mobileCommunitiesOpen),
            },
            { view: 'profile' as SidebarView, icon: User, label: t('profile', locale) },
          ].map(({ view, icon: Icon, label, action }) => (
            <button
              key={view}
              onClick={
                action ??
                (() => {
                  setSidebarView(view);
                  if (view !== 'community') setSelectedCommunity(null);
                })
              }
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-full transition-all ${sidebarView === view ? 'text-[var(--nc-coral)]' : 'text-[#94a0b0]'}`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-extrabold">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile community sheet */}
      {mobileCommunitiesOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileCommunitiesOpen(false)}
        >
          <div className="absolute inset-0 bg-[#2c3340]/30 backdrop-blur-sm" />
          <div
            className="absolute bottom-20 left-3 right-3 nc-glass rounded-[1.75rem] p-4 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#d5dce8] rounded-full mx-auto mb-4" />
            <p className="text-xs font-extrabold text-[#94a0b0] uppercase tracking-widest mb-3">
              {t('myCommunities', locale)}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {joinedCommunities.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCommunity(c);
                    setSidebarView('community');
                    setActiveTab('community');
                    setMobileCommunitiesOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedCommunity?.id === c.id ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: c.cover_color ?? '#1e1b4b' }}
                  >
                    {c.creator_image ? (
                      <img
                        src={c.creator_image}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-black">
                        {c.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-[#2c3340]">{c.name}</p>
                    <p className="text-xs text-zinc-400">
                      {c.member_count.toLocaleString('sv-SE')} members
                    </p>
                  </div>
                  {selectedCommunity?.id === c.id && (
                    <CheckCircle2 size={16} className="text-green-500" />
                  )}
                </button>
              ))}
              <button
                onClick={() => {
                  setSidebarView('search');
                  setMobileCommunitiesOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <Plus size={18} className="text-zinc-500" />
                </div>
                <p className="text-sm font-bold text-zinc-500">{t('findMore', locale)}</p>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes livePulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        @keyframes memberChatPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
