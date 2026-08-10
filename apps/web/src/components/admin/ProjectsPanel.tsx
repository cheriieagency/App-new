'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { adminCardClass } from '@/components/admin/AdminUi';
import ContentPlannerShell from '@/components/planner/ContentPlannerShell';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/lib/locale-context';
import { t, tf } from '@/lib/i18n';
import type { CampaignLabel } from '@/lib/mock-content-planner';

const COLORS = ['#F472B6', '#9089F0', '#10B981', '#F59E0B', '#2B2568', '#0EA5E9'];

/**
 * Projects section: same Planner chrome/views, scoped to posts tagged
 * with the active campaign from the sidebar submenu.
 */
export default function ProjectsPanel() {
  const { locale } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const {
    activeCampaignId,
    setActiveCampaignId,
    createProjectOpen,
    setCreateProjectOpen,
  } = useAdminNav();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1]);
  const [description, setDescription] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const creating = createProjectOpen;

  const { data: campaignsData } = useQuery<{ campaigns: CampaignLabel[] }>({
    queryKey: ['planner-campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/planner/campaigns');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const campaigns = campaignsData?.campaigns ?? [];
  const activeId =
    activeCampaignId && campaigns.some((c) => c.id === activeCampaignId)
      ? activeCampaignId
      : campaigns[0]?.id ?? null;
  const active = campaigns.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (!activeCampaignId && campaigns[0]) {
      setActiveCampaignId(campaigns[0].id);
    }
  }, [activeCampaignId, campaigns, setActiveCampaignId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, color, description }),
      });
      if (!r.ok) throw new Error('create failed');
      return r.json() as Promise<{ campaign: CampaignLabel }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      setName('');
      setDescription('');
      setCreateProjectOpen(false);
      setActiveCampaignId(data.campaign.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (!r.ok) throw new Error('delete failed');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
      setDeleteOpen(false);
      setDeleteAcknowledged(false);
      setActiveCampaignId(null);
    },
  });

  const openDeleteDialog = () => {
    setDeleteAcknowledged(false);
    setDeleteOpen(true);
  };

  const deleteDialog = active ? (
    <Dialog
      open={deleteOpen}
      onOpenChange={(open) => {
        setDeleteOpen(open);
        if (!open) setDeleteAcknowledged(false);
      }}
    >
      <DialogContent className="max-w-[min(440px,94vw)] rounded-2xl border-slate-200/90 p-0 gap-0">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 text-left">
          <DialogTitle className="text-base font-bold text-slate-900">
            {t('deleteProjectTitle', locale)}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 font-medium pt-1">
            <span className="font-semibold text-slate-800">{active.name}</span>
            {' — '}
            {t('deleteProjectConfirm', locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 sm:px-6 pb-2">
          <label className="flex items-start gap-3 min-h-[44px] cursor-pointer rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={deleteAcknowledged}
              onChange={(e) => setDeleteAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500/30"
            />
            <span className="text-sm font-medium text-slate-700 leading-snug">
              {t('deleteProjectPermanentCheckbox', locale)}
            </span>
          </label>
        </div>

        <DialogFooter className="px-5 sm:px-6 py-4 border-t border-slate-100 flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            {t('cancel', locale)}
          </button>
          <button
            type="button"
            disabled={!deleteAcknowledged || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(active.id)}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {t('delete', locale)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  // Creating a project: hide planner until the new project is saved.
  if (creating) {
    return (
      <div className="space-y-6">
        <CreateProjectForm
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          color={color}
          setColor={setColor}
          onCancel={() => setCreateProjectOpen(false)}
          onSave={() => createMutation.mutate()}
          saving={createMutation.isPending}
          locale={locale}
        />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="space-y-6">
        <div className={`${adminCardClass} py-16 text-center text-slate-400`}>
          <FolderKanban size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold">{t('selectProjectHint', locale)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContentPlannerShell
        campaignId={active.id}
        embedded
        eyebrow={t('adminNavProjects', locale)}
        title={active.name}
        description={
          active.description ||
          tf('projectsSub', locale, { name: activeWorkspace.name })
        }
        headerExtra={
          <button
            type="button"
            onClick={openDeleteDialog}
            className="inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label={t('delete', locale)}
          >
            <Trash2 size={16} />
          </button>
        }
      />
      {deleteDialog}
    </div>
  );
}

function CreateProjectForm({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
  onCancel,
  onSave,
  saving,
  locale,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  locale: Parameters<typeof t>[1];
}) {
  return (
    <div className={`${adminCardClass} p-4 sm:p-5 space-y-3`}>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
        {t('newProject', locale)}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('projectNamePlaceholder', locale)}
        className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('projectDescPlaceholder', locale)}
        className="w-full min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/5"
      />
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-8 h-8 min-h-[32px] rounded-full ${
              color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
            }`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
        >
          {t('cancel', locale)}
        </button>
        <button
          type="button"
          disabled={!name.trim() || saving}
          onClick={onSave}
          className="h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40"
        >
          {t('save', locale)}
        </button>
      </div>
    </div>
  );
}
