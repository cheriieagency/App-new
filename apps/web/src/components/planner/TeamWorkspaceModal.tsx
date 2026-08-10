'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Loader2,
  Mail,
  Plus,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TEAM_ROLE_OPTIONS,
  type BrandWorkspace,
  type PlannerTeamMember,
  type TeamRole,
  type WorkspacePlan,
} from '@/lib/mock-content-planner';

type TeamResponse = {
  members: PlannerTeamMember[];
  all_members: PlannerTeamMember[];
  plan: WorkspacePlan;
};

function roleBadge(role: TeamRole) {
  if (role === 'owner') return 'bg-amber-50 text-amber-700';
  if (role === 'editor') return 'bg-indigo-50 text-indigo-700';
  if (role === 'approver') return 'bg-violet-50 text-violet-700';
  return 'bg-zinc-100 text-zinc-600';
}

export default function TeamWorkspaceModal({
  open,
  onOpenChange,
  projectName,
  workspaces,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  workspaces: BrandWorkspace[];
}) {
  const queryClient = useQueryClient();
  const [filterProject, setFilterProject] = useState<'all' | string>('all');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('editor');
  const [memberProject, setMemberProject] = useState(projectName);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMemberProject(projectName);
      setFilterProject('all');
    }
  }, [open, projectName]);

  const { data, isLoading } = useQuery<TeamResponse>({
    queryKey: ['planner-team'],
    queryFn: async () => {
      const r = await fetch('/api/planner/team');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: open,
  });

  const invite = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/planner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name,
          email,
          role,
          project: memberProject,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Failed');
      return json as {
        member: PlannerTeamMember;
        granted_access: boolean;
        plan: WorkspacePlan;
        members: PlannerTeamMember[];
      };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['planner-team'] });
      setName('');
      setEmail('');
      setRole('editor');
      setFlash(
        res.granted_access
          ? `${res.member.name} tillagd — Pro ger access till Content Planner.`
          : `${res.member.name} tillagd som pending. Uppgradera till Pro för planner-access.`
      );
      setTimeout(() => setFlash(null), 4000);
    },
  });

  const updateMember = useMutation({
    mutationFn: async (payload: {
      id: string;
      role?: TeamRole;
      project?: string;
    }) => {
      const r = await fetch('/api/planner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...payload }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-team'] }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch('/api/planner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-team'] }),
  });

  const members = (data?.all_members ?? []).filter((m) =>
    filterProject === 'all' ? true : m.project === filterProject
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg w-[96vw] max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl flex flex-col"
      >
        <div className="px-5 pt-5 pb-3 border-b border-zinc-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--nc-coral)_12%,white)] flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-[var(--nc-coral)]" />
          </div>
          <DialogHeader className="text-left flex-1 space-y-1">
            <DialogTitle className="text-[#2c3340] font-black text-base">
              Team & workspace
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 font-medium">
              Lägg till medlemmar per team-yta / varumärke. Med Pro får de access till Content
            Planner.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-zinc-400 hover:bg-zinc-100 flex items-center justify-center"
            aria-label="Stäng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {flash && (
            <div className="rounded-xl bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)] border border-[var(--nc-coral)]/20 px-3 py-2.5 text-xs font-bold text-[#2c3340] flex items-start gap-2">
              <Check size={14} className="text-[var(--nc-coral)] mt-0.5 flex-shrink-0" />
              {flash}
            </div>
          )}

          {/* Invite form */}
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Bjud in teammedlem
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Namn"
                className="h-11 rounded-xl border-zinc-200 bg-white"
              />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="epost@företag.se"
                type="email"
                className="h-11 rounded-xl border-zinc-200 bg-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340]"
              >
                {TEAM_ROLE_OPTIONS.filter((r) => r.value !== 'owner').map((r) => (
                  <option key={r.value} value={r.value}>
                    Roll: {r.label}
                  </option>
                ))}
              </select>
              <select
                value={memberProject}
                onChange={(e) => setMemberProject(e.target.value)}
                className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340]"
              >
                {workspaces.map((p) => (
                  <option key={p.id} value={p.name}>
                    Team-yta: {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              onClick={() => invite.mutate()}
              disabled={!email.includes('@') || invite.isPending}
              className="w-full h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white font-extrabold gap-2"
            >
              {invite.isPending ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Plus size={14} />
              )}
              Lägg till i teamet
            </Button>
          </div>

          {/* Member list */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Medlemmar ({members.length})
              </p>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-bold text-zinc-600"
              >
                <option value="all">Alla team-ytor</option>
                {workspaces.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <p className="text-sm text-zinc-400 font-medium py-6 text-center">Laddar…</p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-zinc-100 bg-white p-3 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={m.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-zinc-100"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-extrabold text-[#2c3340] truncate">
                            {m.name}
                          </p>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${roleBadge(m.role)}`}
                          >
                            {m.role}
                          </span>
                          {m.planner_access ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-0.5">
                              <Shield size={9} /> Planner
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                              Ingen access
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium truncate flex items-center gap-1 mt-0.5">
                          <Mail size={10} /> {m.email}
                        </p>
                      </div>
                      {m.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => removeMember.mutate(m.id)}
                          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"
                          aria-label="Ta bort"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {m.role !== 'owner' && (
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={m.role}
                          onChange={(e) =>
                            updateMember.mutate({
                              id: m.id,
                              role: e.target.value as TeamRole,
                            })
                          }
                          className="h-10 min-h-[44px] rounded-xl border border-zinc-100 bg-zinc-50 px-2 text-[11px] font-bold text-[#2c3340]"
                        >
                          {TEAM_ROLE_OPTIONS.filter((r) => r.value !== 'owner').map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={m.project}
                          onChange={(e) =>
                            updateMember.mutate({ id: m.id, project: e.target.value })
                          }
                          className="h-10 min-h-[44px] rounded-xl border border-zinc-100 bg-zinc-50 px-2 text-[11px] font-bold text-[#2c3340]"
                        >
                          {workspaces.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {m.role === 'owner' && (
                      <p className="text-[11px] text-zinc-400 font-medium px-0.5">
                        Team-yta: {m.project}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
