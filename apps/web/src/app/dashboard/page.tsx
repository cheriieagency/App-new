'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Download,
  CheckCircle2,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Radio,
  Trophy,
  Image as ImageIcon,
  X,
  Reply,
  Flame,
  Star,
  Medal,
  Crown,
  Sparkles,
  Headphones,
  Copy,
  Gift,
  LinkIcon,
  Home,
  Search,
  User,
  Plus,
  Video,
  FileText,
  Globe,
  Loader2,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import useHandleStreamResponse from '@/utils/useHandleStreamResponse';
import AudioMiniPlayer from '@/components/AudioMiniPlayer';
import useUpload from '@/utils/useUpload';

type TabKey = 'community' | 'events' | 'classroom';
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
  { label: '#Inspiration', color: 'bg-violet-100 text-violet-700', dot: '#8B5CF6' },
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

  const topLevel = (comments as any[]).filter((c) => !c.parent_id);
  const nested = (comments as any[]).filter((c) => !!c.parent_id);

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
                <div className="flex-1">
                  <div className="bg-zinc-50 rounded-xl rounded-tl-none px-3 py-2">
                    <span className="text-xs font-black text-zinc-800">{c.user_name} </span>
                    <span className="text-xs text-zinc-600 leading-relaxed">{c.content}</span>
                    {c.media_url && <CommentMedia url={c.media_url} type={c.media_type} />}
                  </div>
                  <button
                    onClick={() => {
                      setReplyTo(c.id);
                      setReplyToName(c.user_name);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-1 mt-1 text-[10px] font-bold text-zinc-400 hover:text-blue-500 transition-colors ml-2"
                  >
                    <Reply size={10} /> Svara
                  </button>
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
              className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0 mt-0.5"
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
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-violet-500 hover:bg-violet-50 transition-all"
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
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [rsvpdEvents, setRsvpdEvents] = useState<Set<number>>(new Set());
  const [liveEvent, setLiveEvent] = useState<any>(null);
  const [newPost, setNewPost] = useState('');
  const [postTag, setPostTag] = useState<string | null>(null);
  const [postImage, setPostImage] = useState('');
  const [showImage, setShowImage] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const audioIframeRef = useRef<HTMLIFrameElement | null>(null);
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
  useEffect(() => {
    setAudioMode(false);
  }, [activeLesson?.id]);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const r = await fetch('/api/communities');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!session,
  });
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
  const { data: classroom, isLoading: isClassroomLoading } = useQuery({
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

  useEffect(() => {
    if (classroom?.length && !activeCourse) {
      setActiveCourse(classroom[0]);
      if (classroom[0].lessons?.length) setActiveLesson(classroom[0].lessons[0]);
    }
  }, [classroom, activeCourse]);

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
    const lessonContext =
      classroom
        ?.flatMap((c: any) =>
          (c.lessons ?? []).map((l: any) => `[${l.id}] ${l.title} (Course: ${c.title})`)
        )
        .join('\n') ?? '';
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
        const course = classroom?.find((c: any) => c.lessons?.some((l: any) => l.id === lessonId));
        const lesson = course?.lessons?.find((l: any) => l.id === lessonId);
        return (
          <button
            key={i}
            onClick={() => {
              if (lesson) setActiveLesson(lesson);
              if (course) setActiveCourse(course);
              setShowMemberChat(false);
              setSelectedCommunity((communities as any[]).find((c) => c.slug === 'nordic-creator'));
              setSidebarView('community');
              setActiveTab('classroom');
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

  const progressPct = activeCourse
    ? Math.round((completedLessons.size / Math.max(activeCourse.lessons?.length, 1)) * 100)
    : 0;
  const joinedCommunities = (communities as any[]).filter((c: any) => c.is_joined);
  const filteredCommunities = communitySearch
    ? (communities as any[]).filter(
        (c: any) =>
          c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
          c.category.toLowerCase().includes(communitySearch.toLowerCase())
      )
    : (communities as any[]);

  if (isAuthPending)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-plus-jakarta-sans">
        <div className="text-zinc-400">Authenticating…</div>
      </div>
    );
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  if (liveEvent)
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-plus-jakarta-sans">
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
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
          <div className="w-full lg:w-80 bg-zinc-900 flex flex-col border-l border-zinc-800">
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
      className={`group relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${active ? 'bg-white/20 text-white' : 'text-white/40 hover:bg-white/10 hover:text-white/80'}`}
    >
      <Icon size={18} />
      <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {label}
      </span>
    </button>
  );

  // ── Platform Home View ───────────────────────────────────────────────────
  const renderPlatformHome = () => (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-zinc-900">
          Hej, {session.user.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Välkommen tillbaka till Nordic Creator-plattformen.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Gick med',
            value: joinedCommunities.length,
            sub: 'communities',
            color: '#3B82F6',
          },
          {
            label: 'Inlägg',
            value: (feed as any[])?.length ?? 0,
            sub: 'i feeden',
            color: '#10B981',
          },
          {
            label: 'Events',
            value: (events as any[])?.length ?? 0,
            sub: 'kommande',
            color: '#8B5CF6',
          },
          {
            label: 'Kurser',
            value: (classroom as any[])?.length ?? 0,
            sub: 'tillgängliga',
            color: '#F59E0B',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <p className="text-2xl font-black text-zinc-900">{s.value}</p>
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
          Mina Communities
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
              className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all text-left"
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
                <p className="text-sm font-black text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">
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
                Hitta fler communities
              </p>
              <p className="text-xs text-zinc-400">Utforska plattformen</p>
            </div>
          </button>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">
          Senaste från dina communities
        </h2>
        {isFeedLoading ? (
          <div className="text-center py-12 text-zinc-400 text-sm">Laddar feed...</div>
        ) : (
          <div className="space-y-4">
            {(feed as any[])?.slice(0, 5).map((post: any) => {
              const isLiked = likedPosts.has(post.id);
              const ts = tagStyle(post.tag);
              const isExpanded = expandedPosts.has(post.id);
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <LevelAvatar
                      name={post.user_name}
                      image={post.user_image}
                      points={0}
                      size={36}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-zinc-900">{post.user_name}</p>
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
                  <div className="flex items-center gap-1 pt-3 border-t border-zinc-50">
                    <button
                      onClick={() => likeMutation.mutate(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isLiked ? 'bg-red-50 text-red-500' : 'text-zinc-400 hover:bg-zinc-50 hover:text-red-400'}`}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:bg-zinc-50 hover:text-blue-400 transition-all"
                    >
                      <MessageSquare size={14} />
                      {post.comment_count}
                    </button>
                    <button
                      onClick={() => {
                        const nc = (communities as any[]).find((c) => c.slug === 'nordic-creator');
                        if (nc) {
                          setSelectedCommunity(nc);
                          setSidebarView('community');
                        }
                      }}
                      className="ml-auto flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      Öppna community <ChevronRight size={12} />
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
      <h1 className="text-2xl font-black text-zinc-900 mb-2">Sök Communities</h1>
      <p className="text-zinc-500 text-sm mb-6">Hitta communities som matchar dina intressen</p>
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Sök på namn, kategori..."
          value={communitySearch}
          onChange={(e) => setCommunitySearch(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white border border-zinc-200 text-sm font-medium focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCommunities.map((c: any) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
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
              <h3 className="text-sm font-black text-zinc-900 mb-1">{c.name}</h3>
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
                {c.is_joined ? (
                  <button
                    onClick={() => {
                      setSelectedCommunity(c);
                      setSidebarView('community');
                      setActiveTab('community');
                    }}
                    className="flex items-center gap-1 h-7 px-3 rounded-xl bg-green-100 text-green-700 text-xs font-black hover:bg-green-200 transition-all"
                  >
                    ✓ Gå till community
                  </button>
                ) : (
                  <button
                    onClick={() => joinMutation.mutate({ id: c.id, action: 'join' })}
                    disabled={joinMutation.isPending}
                    className="flex items-center gap-1 h-7 px-3 rounded-xl bg-zinc-900 text-white text-xs font-black hover:bg-black transition-all disabled:opacity-60"
                  >
                    Gå med <Plus size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Profile View ─────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-black text-zinc-900 mb-6">Profil & Inställningar</h1>
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <LevelAvatar name={session.user.name} image={session.user.image} points={0} size={56} />
          <div>
            <p className="text-lg font-black text-zinc-900">{session.user.name}</p>
            <p className="text-sm text-zinc-500">{session.user.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Medal size={12} style={{ color: LEVELS[0].color }} />
              <span className="text-xs font-black" style={{ color: LEVELS[0].color }}>
                Nivå 1 · Brons
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
              <p className="text-xl font-black text-zinc-900">{s.val}</p>
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
          <LogOut size={14} /> Logga ut
        </button>
      </div>
      {referral && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
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
                <p className="text-xl font-black text-zinc-900">{s.val}</p>
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
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${refLinkCopied ? 'bg-green-100 text-green-600' : 'bg-zinc-900 text-white hover:bg-black'}`}
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
    const isNordicCreator = comm?.slug === 'nordic-creator';
    return (
      <div style={{ paddingBottom: audioMode && activeLesson ? 80 : 0 }}>
        <div className="bg-white border-b border-zinc-100 px-4 sm:px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-4 flex-wrap">
            <div
              className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-100 flex-shrink-0"
              style={{ background: comm?.cover_color ?? '#1e1b4b' }}
            >
              {comm?.creator_image ? (
                <img
                  src={comm.creator_image}
                  alt={comm.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-black">
                  {comm?.name?.[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black text-zinc-900 truncate">{comm?.name}</h1>
              <p className="text-xs text-zinc-400 font-medium">
                {comm?.category} · {comm?.member_count?.toLocaleString('sv-SE')} members
              </p>
            </div>
            <nav className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
              {MAIN_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {!isNordicCreator ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <Globe size={28} className="text-zinc-400" />
            </div>
            <h2 className="text-xl font-black text-zinc-700 mb-2">{comm?.name}</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Denna community öppnar snart. Håll utkik! 🚀
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-bold">
              <CheckCircle2 size={14} /> Du är med i denna community
            </div>
          </div>
        ) : (
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
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${communitySubTab === key ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
                      >
                        <Icon size={13} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {communitySubTab === 'feed' && (
                    <>
                      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
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
                                placeholder="Dela något med communityn... 🇸🇪"
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
                              className="rounded-xl bg-zinc-900 hover:bg-black text-white font-bold h-9 px-5 flex items-center gap-2"
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
                        feed?.map((post: any) => {
                          const isLiked = likedPosts.has(post.id);
                          const isExpanded = expandedPosts.has(post.id);
                          const ts = tagStyle(post.tag);
                          return (
                            <div
                              key={post.id}
                              className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
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
                                      <p className="text-sm font-black text-zinc-900">
                                        {post.user_name}
                                      </p>
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
                                <div className="flex items-center gap-1 pt-3 border-t border-zinc-50">
                                  <button
                                    onClick={() => likeMutation.mutate(post.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isLiked ? 'bg-red-50 text-red-500' : 'text-zinc-400 hover:bg-zinc-50 hover:text-red-400'}`}
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
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isExpanded ? 'bg-blue-50 text-blue-600' : 'text-zinc-400 hover:bg-zinc-50 hover:text-blue-400'}`}
                                  >
                                    <MessageSquare size={14} />
                                    {post.comment_count}{' '}
                                    {post.comment_count === 1 ? 'kommentar' : 'kommentarer'}
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
                      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden divide-y divide-zinc-50">
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
                                  <p className="text-sm font-black text-zinc-900 truncate">
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
                              <p className="text-lg font-black text-zinc-900">{member.points}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
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
                        <p className="text-sm font-black text-zinc-900">{session.user.name}</p>
                        <p className="text-xs font-black" style={{ color: LEVELS[0].color }}>
                          Nivå 1 · Brons
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
                          <p className="text-base font-black text-zinc-900">{s.val}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
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
                  <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
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
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${refLinkCopied ? 'bg-green-100 text-green-600' : 'bg-zinc-900 text-white hover:bg-black'}`}
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
                  <h2 className="text-2xl font-black text-zinc-900">Upcoming Events</h2>
                  <Link
                    href="/events"
                    className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all"
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
                          className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden hover:shadow-lg transition-all"
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
                            <h3 className="text-base font-black text-zinc-900 leading-snug mb-2">
                              {event.title}
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                              {event.description}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => rsvpMutation.mutate(event.id)}
                                className={`flex-1 h-10 rounded-xl text-xs font-black transition-all active:scale-95 ${hasRsvpd ? 'bg-green-100 text-green-700' : 'bg-zinc-900 text-white shadow-sm'}`}
                              >
                                {hasRsvpd ? '✓ OSA Bekräftad' : 'OSA / Attending'}
                              </button>
                              {isLive && (
                                <button
                                  onClick={() => setLiveEvent(event)}
                                  className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Radio size={12} /> Gå med Live
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

            {activeTab === 'classroom' && (
              <div>
                {isClassroomLoading ? (
                  <div className="text-center py-16 text-zinc-400 text-sm">Laddar kurser...</div>
                ) : activeCourse ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
                        {activeLesson?.video_url ? (
                          <>
                            <iframe
                              key={activeLesson.id}
                              ref={audioIframeRef}
                              src={
                                activeLesson.video_url.includes('?')
                                  ? `${activeLesson.video_url}&enablejsapi=1`
                                  : `${activeLesson.video_url}?enablejsapi=1`
                              }
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              style={{ opacity: audioMode ? 0 : 1, transition: 'opacity 0.3s' }}
                            />
                            {audioMode && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-blue-950 to-indigo-950">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                                  <Headphones size={28} className="text-white" />
                                </div>
                                <p className="text-white font-black text-sm text-center px-6">
                                  {activeLesson?.title}
                                </p>
                                <p className="text-white/50 text-xs mt-1">{activeCourse?.title}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <PlayCircle size={64} strokeWidth={1} />
                          </div>
                        )}
                      </div>
                      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">
                              {activeCourse.title}
                            </p>
                            <h2 className="text-xl font-black text-zinc-900">
                              {activeLesson?.title ?? 'Välj en lektion'}
                            </h2>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {activeLesson?.video_url && (
                              <button
                                onClick={() => setAudioMode((v) => !v)}
                                className={`flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl transition-all ${audioMode ? 'bg-blue-900 text-blue-300' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                              >
                                <Headphones size={13} />
                                {audioMode ? 'Video' : 'Audio'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (activeLesson)
                                  setCompletedLessons((prev) => {
                                    const n = new Set(prev);
                                    n.has(activeLesson.id)
                                      ? n.delete(activeLesson.id)
                                      : n.add(activeLesson.id);
                                    return n;
                                  });
                              }}
                              className={`flex items-center gap-2 text-xs font-black px-3 py-2 rounded-xl transition-all ${activeLesson && completedLessons.has(activeLesson.id) ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                            >
                              <CheckCircle2 size={14} />
                              {activeLesson && completedLessons.has(activeLesson.id)
                                ? 'Klar!'
                                : 'Markera klar'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-5">
                          <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                            <span>Kursframsteg</span>
                            <span className="text-blue-500">{progressPct}% Klart</span>
                          </div>
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                        <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors px-3 py-2 rounded-xl hover:bg-zinc-50 mt-4">
                          <Download size={13} /> PDF Guide
                        </button>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-zinc-50">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                          Lektioner
                        </h3>
                        <p className="text-sm font-black text-zinc-900 mt-0.5">
                          {activeCourse.lessons?.length} lektioner
                        </p>
                      </div>
                      <div className="divide-y divide-zinc-50">
                        {activeCourse.lessons?.map((lesson: any, idx: number) => {
                          const isDone = completedLessons.has(lesson.id);
                          const isActive = activeLesson?.id === lesson.id;
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setActiveLesson(lesson)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isActive ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black ${isDone ? 'bg-green-100 text-green-600' : isActive ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}
                              >
                                {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                              </div>
                              <p
                                className={`text-xs font-bold flex-1 truncate ${isActive ? 'text-blue-700' : 'text-zinc-700'}`}
                              >
                                {lesson.title}
                              </p>
                              {isActive && (
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-zinc-400 text-sm">
                    Inga kurser tillgängliga
                  </div>
                )}

                {audioMode && activeLesson && (
                  <AudioMiniPlayer
                    lessonTitle={activeLesson.title}
                    courseName={activeCourse?.title ?? ''}
                    iframeRef={audioIframeRef}
                    onClose={() => setAudioMode(false)}
                  />
                )}

                <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
                  {showMemberChat && (
                    <div
                      className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
                      style={{ height: 490 }}
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
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
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
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
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F4F4F6] font-plus-jakarta-sans">
      {/* Left Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col items-center w-16 bg-zinc-900 fixed left-0 top-0 bottom-0 z-30 py-4 gap-2">
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-3 hover:bg-white/20 transition-colors"
        >
          <span className="text-white font-black text-xs">NC</span>
        </Link>
        <SidebarIcon
          icon={Home}
          label="Dashboard"
          active={sidebarView === 'home'}
          onClick={() => {
            setSidebarView('home');
            setSelectedCommunity(null);
          }}
        />
        <SidebarIcon
          icon={Search}
          label="Sök Communities"
          active={sidebarView === 'search'}
          onClick={() => setSidebarView('search')}
        />
        <SidebarIcon
          icon={User}
          label="Profil & Inställningar"
          active={sidebarView === 'profile'}
          onClick={() => setSidebarView('profile')}
        />
        {joinedCommunities.length > 0 && (
          <>
            <div className="w-8 h-px bg-white/15 my-1" />
            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">
              Mina
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
                className={`relative w-10 h-10 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all hover:scale-105 ${isActive ? 'border-white shadow-lg' : 'border-transparent hover:border-white/40'}`}
                style={{ background: c.cover_color ?? '#1e1b4b' }}
              >
                {c.creator_image ? (
                  <img src={c.creator_image} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-black text-sm">
                    {c.name[0]}
                  </div>
                )}
                {isActive && (
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                )}
              </button>
            );
          })}
          <button
            title="Hitta fler"
            onClick={() => setSidebarView('search')}
            className="w-10 h-10 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/40 transition-all flex-shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={() =>
            authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/') } })
          }
          title="Logga ut"
          className="w-10 h-10 rounded-2xl text-white/30 hover:text-white/70 hover:bg-white/10 flex items-center justify-center transition-colors mt-2"
        >
          <LogOut size={16} />
        </button>
      </aside>

      {/* Main area */}
      <div className="flex-1 lg:ml-16 flex flex-col min-h-screen">
        <header className="bg-white border-b border-zinc-100 sticky top-0 z-20">
          <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <Link
                href="/"
                className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0"
              >
                <span className="text-white font-black text-xs">NC</span>
              </Link>
              {selectedCommunity && sidebarView === 'community' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSidebarView('home');
                      setSelectedCommunity(null);
                    }}
                    className="text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span className="font-black text-zinc-900 text-sm truncate">
                    {selectedCommunity.name}
                  </span>
                </div>
              ) : (
                <span className="font-black text-zinc-900 text-sm">
                  {sidebarView === 'search'
                    ? 'Sök Communities'
                    : sidebarView === 'profile'
                      ? 'Profil'
                      : 'Dashboard'}
                </span>
              )}
            </div>
            <div className="hidden lg:block">
              <span className="font-black text-zinc-900 text-sm">
                {sidebarView === 'community' && selectedCommunity
                  ? selectedCommunity.name
                  : sidebarView === 'search'
                    ? 'Sök Communities'
                    : sidebarView === 'profile'
                      ? 'Profil & Inställningar'
                      : 'Dashboard'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 lg:hidden overflow-x-auto max-w-[180px]">
                {joinedCommunities.slice(0, 4).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCommunity(c);
                      setSidebarView('community');
                      setActiveTab('community');
                    }}
                    className={`w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${selectedCommunity?.id === c.id && sidebarView === 'community' ? 'border-zinc-900' : 'border-transparent'}`}
                    style={{ background: c.cover_color ?? '#1e1b4b' }}
                  >
                    {c.creator_image ? (
                      <img
                        src={c.creator_image}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-black text-xs">{c.name[0]}</span>
                    )}
                  </button>
                ))}
              </div>
              <LevelAvatar
                name={session.user.name}
                image={session.user.image}
                points={0}
                size={32}
              />
            </div>
          </div>
        </header>

        <main className="flex-1">
          {sidebarView === 'home' && renderPlatformHome()}
          {sidebarView === 'search' && renderSearch()}
          {sidebarView === 'profile' && renderProfile()}
          {sidebarView === 'community' && selectedCommunity && renderCommunity()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-zinc-100 z-20">
        <div className="flex items-center justify-around h-14 px-2">
          {[
            { view: 'home' as SidebarView, icon: Home, label: 'Hem' },
            { view: 'search' as SidebarView, icon: Search, label: 'Sök' },
            {
              view: 'community' as SidebarView,
              icon: Users,
              label: 'Communities',
              action: () => setMobileCommunitiesOpen(!mobileCommunitiesOpen),
            },
            { view: 'profile' as SidebarView, icon: User, label: 'Profil' },
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
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${sidebarView === view ? 'text-zinc-900' : 'text-zinc-400'}`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-black">{label}</span>
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
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-14 left-0 right-0 bg-white rounded-t-3xl p-4 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-4" />
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">
              Mina Communities
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
                    <p className="text-sm font-black text-zinc-900">{c.name}</p>
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
                <p className="text-sm font-bold text-zinc-500">Hitta fler communities</p>
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
