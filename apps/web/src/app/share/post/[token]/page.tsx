'use client';

/**
 * Client review page — post preview + public chat only (no login).
 * Private Studio chat is never exposed here.
 */

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import FeedPreview from '@/components/planner/FeedPreview';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type {
  PlannerComment,
  PlannerMediaItem,
  SocialPlatform,
} from '@/lib/mock-content-planner';

type SharedPost = {
  title: string;
  caption: string;
  hashtags: string;
  platforms: SocialPlatform[];
  media_items: PlannerMediaItem[];
  project: string;
  comments: PlannerComment[];
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function PublicPostSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [post, setPost] = useState<SharedPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/planner/share/${encodeURIComponent(token)}`);
      const json = (await r.json()) as {
        ok?: boolean;
        post?: SharedPost;
        message?: string;
        error?: string;
      };
      if (!r.ok || !json.ok || !json.post) {
        setError(json.message || json.error || 'Link unavailable');
        setPost(null);
        return;
      }
      setPost(json.post);
      setError(null);
    } catch {
      setError('Failed to load this post');
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/planner/share/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: guestName.trim() || 'Guest',
          text: message.trim(),
        }),
      });
      const json = (await r.json()) as {
        ok?: boolean;
        post?: SharedPost;
        message?: string;
      };
      if (!r.ok || !json.ok) {
        setError(json.message || 'Could not send message');
        return;
      }
      if (json.post) setPost(json.post);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-slate-400 flex items-center justify-center gap-2 text-sm font-medium">
        <Loader2 size={16} className="animate-spin" />
        Loading post…
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold">Link unavailable</p>
        <p className="text-sm text-slate-500 max-w-sm">
          {error || 'This share link is invalid or has been disabled.'}
        </p>
        <Link
          href="https://clikd.app"
          className="mt-2 h-11 min-h-[44px] px-4 rounded-xl bg-[#F472B6] text-white text-xs font-semibold inline-flex items-center"
        >
          Powered by clikd:
        </Link>
      </div>
    );
  }

  const caption = [post.caption, post.hashtags].filter(Boolean).join('\n\n');

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900">
      <header className="border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 truncate">
              {post.project || 'Shared post'}
            </p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {post.title || 'Post review'}
            </p>
          </div>
          <p className="text-[11px] font-medium text-slate-400 flex-shrink-0">
            Public review · clikd:
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 mb-3">Live preview</p>
          <FeedPreview
            caption={caption || 'Caption…'}
            mediaItems={post.media_items}
            platforms={post.platforms}
            username="@brand"
            displayName={post.project || 'Brand'}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col min-h-[420px] max-h-[min(720px,80vh)] overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <MessageCircle size={15} className="text-[#F472B6]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Public chat</p>
              <p className="text-[11px] text-slate-400 font-medium">
                Visible to everyone with this link
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
            {post.comments.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-6 text-center">
                No public messages yet — leave feedback for the creator.
              </p>
            ) : (
              post.comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#2B2568] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {(c.author_name || 'G').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-800">
                        {c.author_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatRelative(c.created_at)}
                      </span>
                    </div>
                    {c.text ? (
                      <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">
                        {c.text}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 sm:p-4 border-t border-slate-100 space-y-2 bg-white">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              className="h-11 min-h-[44px] rounded-xl border-slate-200 text-sm"
            />
            <div className="flex items-end gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a public comment…"
                className="flex-1 min-h-[44px] max-h-28 rounded-xl border-slate-200 resize-none text-sm py-2.5"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !message.trim()}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-[#F472B6] text-white flex items-center justify-center disabled:opacity-40"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
