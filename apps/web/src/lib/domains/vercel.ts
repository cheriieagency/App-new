/**
 * Vercel Domains API helpers for Pro custom domain linking.
 */

import { vercelEnv } from '@/lib/config/env';

function authHeaders(): HeadersInit {
  const token = vercelEnv.token();
  if (!token) throw new Error('VERCEL_AUTH_BEARER_TOKEN is not configured');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function projectId(): string {
  const id = vercelEnv.projectId();
  if (!id) throw new Error('VERCEL_PROJECT_ID is not configured');
  return id;
}

function withTeam(url: URL) {
  const teamId = vercelEnv.teamId();
  if (teamId) url.searchParams.set('teamId', teamId);
  return url;
}

export type VercelDomainResult = {
  name: string;
  verified: boolean;
  verification?: Array<{ type?: string; domain?: string; value?: string }>;
  error?: string;
};

/** Add a domain to the Vercel project. */
export async function vercelAddDomain(domainName: string): Promise<VercelDomainResult> {
  const url = withTeam(
    new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId())}/domains`)
  );
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name: domainName }),
  });
  const data = (await res.json()) as {
    name?: string;
    verified?: boolean;
    verification?: VercelDomainResult['verification'];
    error?: { message?: string; code?: string };
  };

  // 409 = already exists on project — treat as success and re-fetch status.
  if (res.status === 409 || data.error?.code === 'domain_already_in_use') {
    return vercelGetDomain(domainName);
  }

  if (!res.ok) {
    throw new Error(
      data.error?.message || `Vercel add domain failed (${res.status})`
    );
  }

  return {
    name: data.name || domainName,
    verified: Boolean(data.verified),
    verification: data.verification,
  };
}

/** Remove a domain from the Vercel project. */
export async function vercelRemoveDomain(domainName: string): Promise<void> {
  const url = withTeam(
    new URL(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId())}/domains/${encodeURIComponent(domainName)}`
    )
  );
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (res.status === 404) return;
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      data.error?.message || `Vercel remove domain failed (${res.status})`
    );
  }
}

/** Fetch domain verification status from Vercel. */
export async function vercelGetDomain(domainName: string): Promise<VercelDomainResult> {
  const url = withTeam(
    new URL(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId())}/domains/${encodeURIComponent(domainName)}`
    )
  );
  const res = await fetch(url.toString(), { headers: authHeaders() });
  const data = (await res.json()) as {
    name?: string;
    verified?: boolean;
    verification?: VercelDomainResult['verification'];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(
      data.error?.message || `Vercel get domain failed (${res.status})`
    );
  }
  return {
    name: data.name || domainName,
    verified: Boolean(data.verified),
    verification: data.verification,
  };
}
