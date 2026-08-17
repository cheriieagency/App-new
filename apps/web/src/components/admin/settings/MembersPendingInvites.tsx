'use client';

import { Mail, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass } from '@/components/admin/AdminUi';
import type { PendingInvite } from '@/lib/settings-prefs';

type MembersPendingInvitesProps = {
  invites: PendingInvite[];
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
};

export default function MembersPendingInvites({
  invites,
  onResend,
  onRevoke,
}: MembersPendingInvitesProps) {
  return (
    <div className="mt-8 pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            Pending invites
          </p>
          <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
            Awaiting acceptance
          </h4>
        </div>
        <span className="text-[11px] font-mono font-bold text-slate-400">
          {invites.length}
        </span>
      </div>

      {invites.length === 0 ? (
        <p className="text-sm text-slate-400 font-medium py-4">
          No pending invites.
        </p>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className={`${adminCardClass} p-3.5 flex flex-col sm:flex-row sm:items-center gap-3`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center">
                  <Mail size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {invite.name || invite.email}
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {invite.email} · {invite.role}
                    {invite.space !== 'all' ? ` · ${invite.space}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Invited{' '}
                    {new Date(invite.invitedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onResend(invite.id);
                    toast.success(`Invite resent to ${invite.email}`);
                  }}
                  className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={13} />
                  Resend Invite
                </button>
                <button
                  type="button"
                  onClick={() => onRevoke(invite.id)}
                  className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={13} />
                  Revoke Invite
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
