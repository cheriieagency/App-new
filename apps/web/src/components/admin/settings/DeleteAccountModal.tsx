'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

type DeleteAccountModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
};

/**
 * Requires typing DELETE before account deletion can proceed.
 */
export default function DeleteAccountModal({
  open,
  onClose,
  onConfirm,
  busy = false,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  if (!open) return null;

  const canDelete = confirmText.trim() === 'DELETE' && !busy;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl p-5 sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 h-10 w-10 min-h-[40px] min-w-[40px] rounded-xl inline-flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <X size={16} />
        </button>
        <h2
          id="delete-account-title"
          className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight pr-10"
        >
          Delete account?
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
          This permanently removes your clikd: account and associated creator data.
          Type <span className="font-mono font-bold text-slate-800">DELETE</span> to
          confirm.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          autoComplete="off"
          className="mt-4 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-rose-300"
        />
        <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => void onConfirm()}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
