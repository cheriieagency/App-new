'use client';

import { Mail, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useLanguage } from '@/lib/i18n';
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
  const { t } = useLanguage();

  return (
    <div className="mt-8 pt-6 border-t border-[#E6E3DB]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#8A857D]">
            Pending invites
          </p>
          <h4 className="text-sm font-medium text-[#2C2621] mt-0.5">
            Awaiting acceptance
          </h4>
        </div>
        <span className="text-[11px] font-mono font-bold text-[#8A857D]">
          {invites.length}
        </span>
      </div>

      {invites.length === 0 ? (
        <p className="text-sm text-[#8A857D] font-medium py-4">
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
                <span className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full bg-[rgba(184,92,56,0.08)] border border-amber-100 text-[#B85C38] flex items-center justify-center">
                  <Mail size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2C2621] truncate">
                    {invite.name || invite.email}
                  </p>
                  <p className="text-xs text-[#8A857D] font-medium truncate">
                    {invite.email} · {invite.role}
                    {invite.space !== 'all' ? ` · ${invite.space}` : ''}
                  </p>
                  <p className="text-[10px] text-[#8A857D] font-medium mt-0.5">
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
                    toast.success(t('toastInviteResent', { email: invite.email }));
                  }}
                  className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] text-xs font-bold text-[#2C2621] hover:bg-[#F0EFEA]"
                >
                  <RefreshCw size={13} />
                  Resend Invite
                </button>
                <button
                  type="button"
                  onClick={() => onRevoke(invite.id)}
                  className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl border border-rose-200 bg-[#FFFFFF] text-xs font-bold text-rose-600 hover:bg-rose-50"
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
