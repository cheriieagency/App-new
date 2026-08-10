'use client';

import { Image as ImageIcon } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';

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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Media Library"
        title="Media"
        description={`Creatives för ${activeWorkspace.name}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {MEDIA.map((m) => (
          <div key={m.id} className={`${adminCardClass} overflow-hidden text-left`}>
            <img src={m.image} alt={m.label} className="w-full aspect-square object-cover" />
            <div className="p-3">
              <p className="text-sm font-semibold text-slate-900 truncate">{m.label}</p>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                {m.platform}
              </p>
            </div>
          </div>
        ))}
      </div>

      {MEDIA.length === 0 && (
        <div className={`${adminCardClass} py-16 text-center text-slate-400`}>
          <ImageIcon size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold">Ingen media ännu</p>
        </div>
      )}
    </div>
  );
}
