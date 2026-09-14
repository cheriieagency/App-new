'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BrandWorkspace, SocialPlatform } from '@/lib/mock-content-planner';
import { profileAsBrandWorkspace } from '@/lib/mock-workspace-profiles';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { useSubscription } from '@/components/common/useSubscription';

/** Default channels when creating a workspace (connect later in Settings → Socials). */
const DEFAULT_CHANNELS: SocialPlatform[] = ['instagram', 'tiktok', 'linkedin'];

export default function CreateWorkspaceModal({
  open,
  onOpenChange,
  onCreated,
  /** Optional secondary sync endpoint (community mirror). Primary create is local. */
  createUrl = '/api/admin/workspaces',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workspace: BrandWorkspace) => void;
  createUrl?: string;
}) {
  const { t } = useLanguage();
  const workspaceCtx = useWorkspaceOptional();
  const { checkLimit, requestUpgrade, loading: planLoading } = useSubscription();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setHandle('');
    setError('');
  };

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const existingCount = workspaceCtx?.brandWorkspaces.length ?? 0;
      const gate = checkLimit('maxWorkspaces', existingCount);
      if (!gate.allowed) {
        requestUpgrade('pro');
        setError(
          `Workspace limit reached (${existingCount}/${gate.limit}). Upgrade to add more brands.`
        );
        return;
      }

      const channels = DEFAULT_CHANNELS;

      // Primary path: WorkspaceContext persists locally + to /api/admin/workspaces.
      if (workspaceCtx) {
        const created = workspaceCtx.createWorkspace({
          name: name.trim(),
          handle: handle.trim() || undefined,
          channels,
        });
        const brand = profileAsBrandWorkspace(created);
        onCreated(brand);
        toast.success(t('toastWorkspaceActivated', { name: created.name }));
        resetForm();
        onOpenChange(false);
        return;
      }

      // Fallback when rendered outside WorkspaceProvider.
      const r = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, handle, channels, existingCount }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data?.error === 'UPGRADE_REQUIRED') {
          requestUpgrade(data.minPlan || 'pro');
        }
        throw new Error(data.error || 'Failed');
      }
      onCreated(data.workspace);
      toast.success(
        t('toastWorkspaceActivated', { name: data.workspace?.name || name })
      );
      resetForm();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('toastWorkspaceCreateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-black text-[#2c3340]">
            {t('createBrandWorkspaceTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 font-medium">
            {t('createBrandWorkspaceSub')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
              {t('brandWorkspaceNameLabel')}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('brandWorkspaceNamePlaceholder')}
              className="h-11 rounded-xl border-zinc-200 font-extrabold"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
              {t('socialHandleLabel')}
            </label>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={t('socialHandlePlaceholder')}
              className="h-11 rounded-xl border-zinc-200 font-mono text-sm"
            />
          </div>
          {error && (
            <p className="text-xs font-bold text-red-500">{error}</p>
          )}
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!name.trim() || saving || planLoading}
            className="w-full h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white font-extrabold gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                {t('common.loading')}
              </>
            ) : (
              <>
                <Plus size={14} />
                Create & activate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
