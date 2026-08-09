'use client';

import { Image as ImageIcon } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';

const MEDIA = [
  {
    id: 'm1',
    label: 'Glow essentials flatlay',
    platform: 'Instagram',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
  },
  {
    id: 'm2',
    label: 'Routine demo',
    platform: 'TikTok',
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
  },
  {
    id: 'm3',
    label: 'Studio B-roll',
    platform: 'Instagram',
    image:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80',
  },
];

export default function MediaLibraryPanel() {
  const { activeWorkspace } = useWorkspace();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
          Media Library · {activeWorkspace.name}
        </p>
        <h1 className="text-xl sm:text-2xl font-black text-[#1f2430] tracking-tight">
          Media
        </h1>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">
          Browse creatives for your active Social Set.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MEDIA.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl overflow-hidden border border-zinc-200 bg-white text-left"
          >
            <img src={m.image} alt={m.label} className="w-full aspect-square object-cover" />
            <div className="p-2.5">
              <p className="text-xs font-extrabold text-[#1f2430] truncate">{m.label}</p>
              <p className="text-[10px] font-bold text-zinc-400">{m.platform}</p>
            </div>
          </div>
        ))}
      </div>

      {MEDIA.length === 0 && (
        <div className="py-16 text-center text-zinc-400">
          <ImageIcon size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-bold">No media yet</p>
        </div>
      )}
    </div>
  );
}
