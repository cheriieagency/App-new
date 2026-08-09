'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { BrandWorkspace, SocialPlatform } from '@/lib/mock-content-planner';

const CHANNELS: { key: SocialPlatform; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
];

export default function CreateWorkspaceModal({
  open,
  onOpenChange,
  onCreated,
  /** Defaults to planner workspaces; admin can pass `/api/admin/workspaces`. */
  createUrl = '/api/planner/workspaces',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workspace: BrandWorkspace) => void;
  createUrl?: string;
}) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [channels, setChannels] = useState<SocialPlatform[]>([
    'instagram',
    'tiktok',
    'linkedin',
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (p: SocialPlatform) => {
    setChannels((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, handle, channels }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      onCreated(data.workspace);
      setName('');
      setHandle('');
      setChannels(['instagram', 'tiktok', 'linkedin']);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte skapa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-black text-[#2c3340]">
            Create new Team Workspace / Brand
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 font-medium">
            Create a workspace for a brand or team with its own channels and content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
              Brand / Team Workspace Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='t.ex. "Acme Brand Scandinavia"'
              className="h-11 rounded-xl border-zinc-200 font-extrabold"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
              Social Media Handle
            </label>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder='t.ex. "@acme_official"'
              className="h-11 rounded-xl border-zinc-200 font-mono text-sm"
            />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
              Connected Channels
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map(({ key, label }) => {
                const checked = channels.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2 h-11 min-h-[44px] px-3 rounded-xl border text-xs font-extrabold cursor-pointer ${
                      checked
                        ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)]'
                        : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                    }`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(key)} />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
          {error && (
            <p className="text-xs font-bold text-red-500">{error}</p>
          )}
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!name.trim() || channels.length === 0 || saving}
            className="w-full h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white font-extrabold gap-2"
          >
            {saving ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Plus size={14} />
            )}
            Create & activate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
