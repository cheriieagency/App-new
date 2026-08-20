/**
 * Secure Comment-to-DM auto-poll — one shared 20s timer per workspace (no duplicate
 * Meta Graph calls when Automations panel + admin shell both mount).
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/context/WorkspaceContext';

export const DM_COMMENT_POLL_INTERVAL_MS = 20_000;

export type CommentToDmPollResult = {
  ok?: boolean;
  sent?: number;
  matched?: number;
  commentsFetched?: number;
  errors?: string[];
  error?: string;
  message?: string;
  httpOk?: boolean;
  throttled?: boolean;
};

type Listener = (result: CommentToDmPollResult) => void;

type PollController = {
  workspaceId: string;
  listeners: Set<Listener>;
  intervalId: number | null;
  inFlight: boolean;
  stop: () => void;
};

const controllers = new Map<string, PollController>();

async function runPollForWorkspace(
  workspaceId: string,
  qc: ReturnType<typeof useQueryClient>
): Promise<void> {
  const ctrl = controllers.get(workspaceId);
  if (!ctrl || ctrl.inFlight) return;
  ctrl.inFlight = true;
  try {
    const res = await fetch('/api/admin/inbox/automations/poll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId,
        'x-active-workspace-id': workspaceId,
      },
      credentials: 'include',
      body: JSON.stringify({ workspaceId }),
    });
    const json = (await res.json().catch(() => ({}))) as CommentToDmPollResult;
    const result: CommentToDmPollResult = { ...json, httpOk: res.ok };

    for (const listener of ctrl.listeners) {
      try {
        listener(result);
      } catch {
        /* ignore listener errors */
      }
    }

    if (res.ok && Number(json.sent) > 0) {
      void qc.invalidateQueries({
        queryKey: ['dm-automations', workspaceId],
      });
    }
  } catch (err) {
    console.warn('[commentToDmAutoPoll]', err);
    const fail: CommentToDmPollResult = {
      ok: false,
      error: 'network_error',
      httpOk: false,
    };
    for (const listener of ctrl.listeners) {
      try {
        listener(fail);
      } catch {
        /* ignore */
      }
    }
  } finally {
    if (ctrl) ctrl.inFlight = false;
  }
}

function ensureController(
  workspaceId: string,
  qc: ReturnType<typeof useQueryClient>
): PollController {
  let ctrl = controllers.get(workspaceId);
  if (ctrl) return ctrl;

  ctrl = {
    workspaceId,
    listeners: new Set(),
    intervalId: null,
    inFlight: false,
    stop() {
      if (this.intervalId != null) {
        window.clearInterval(this.intervalId);
        this.intervalId = null;
      }
      controllers.delete(workspaceId);
    },
  };
  controllers.set(workspaceId, ctrl);

  void runPollForWorkspace(workspaceId, qc);
  ctrl.intervalId = window.setInterval(() => {
    void runPollForWorkspace(workspaceId, qc);
  }, DM_COMMENT_POLL_INTERVAL_MS);

  return ctrl;
}

type UseCommentToDmAutoPollOptions = {
  enabled?: boolean;
  onResult?: (result: CommentToDmPollResult) => void;
};

/**
 * Subscribe to the shared 20s Comment-to-DM poll for the active workspace.
 */
export function useCommentToDmAutoPoll(
  options: UseCommentToDmAutoPollOptions = {}
): CommentToDmPollResult | null {
  const { enabled = true, onResult } = options;
  const { activeWorkspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [lastResult, setLastResult] = useState<CommentToDmPollResult | null>(
    null
  );
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!enabled || !activeWorkspaceId) return;

    const workspaceId = activeWorkspaceId;
    const ctrl = ensureController(workspaceId, qc);

    const listener: Listener = (result) => {
      setLastResult(result);
      onResultRef.current?.(result);
    };
    ctrl.listeners.add(listener);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runPollForWorkspace(workspaceId, qc);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      ctrl.listeners.delete(listener);
      // Keep the shared timer alive if other subscribers remain (e.g. admin shell).
      if (ctrl.listeners.size === 0) {
        ctrl.stop();
      }
    };
  }, [enabled, activeWorkspaceId, qc]);

  return lastResult;
}
