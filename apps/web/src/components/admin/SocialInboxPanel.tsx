'use client';

import { Inbox, MessageCircle } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';

const THREADS = [
  {
    id: 1,
    name: 'Emma L.',
    preview: 'Is the serum still in stock?',
    platform: 'Instagram',
    time: '12m',
  },
  {
    id: 2,
    name: 'Marcus J.',
    preview: 'Loved the reel — link please!',
    platform: 'TikTok',
    time: '1h',
  },
  {
    id: 3,
    name: 'Astrid K.',
    preview: 'Can I get a refund on my order?',
    platform: 'Instagram',
    time: '3h',
  },
];

export default function SocialInboxPanel() {
  const { activeWorkspace } = useWorkspace();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
          Social Inbox · {activeWorkspace.name}
        </p>
        <h1 className="text-xl sm:text-2xl font-black text-[#1f2430] tracking-tight">
          Conversations
        </h1>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">
          DMs and comments across your Social Set profiles.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {THREADS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 text-left min-h-[56px]"
          >
            <div className="w-10 h-10 rounded-full bg-[#f2eeff] flex items-center justify-center text-[#7c6cf0]">
              <MessageCircle size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-[#1f2430] truncate">{t.name}</p>
                <span className="text-[10px] font-bold text-zinc-400 flex-shrink-0">{t.time}</span>
              </div>
              <p className="text-xs text-zinc-500 truncate">{t.preview}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 mt-0.5">
                {t.platform}
              </p>
            </div>
          </button>
        ))}
        {THREADS.length === 0 && (
          <div className="py-16 text-center text-zinc-400">
            <Inbox size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">Inbox zero</p>
          </div>
        )}
      </div>
    </div>
  );
}
