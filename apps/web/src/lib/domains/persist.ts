/**
 * Custom domain persistence — profiles + workspaces rows for Pro linking.
 */

import sql from '@/app/api/utils/sql';

export type DomainRecord = {
  domain: string;
  verified: boolean;
  workspace_id: string | null;
  user_id: string;
  slug: string | null;
  default_community_slug: string | null;
};

let schemaReady: Promise<void> | null = null;

export async function ensureDomainsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS custom_domain text,
        ADD COLUMN IF NOT EXISTS custom_domain_verified boolean DEFAULT false
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_custom_domain_uidx
        ON public.profiles (custom_domain)
        WHERE custom_domain IS NOT NULL
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.workspaces (
        id                      text PRIMARY KEY,
        user_id                 text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        name                    text,
        slug                    text,
        default_community_slug  text,
        custom_domain           text,
        custom_domain_verified  boolean NOT NULL DEFAULT false,
        created_at              timestamptz NOT NULL DEFAULT now(),
        updated_at              timestamptz NOT NULL DEFAULT now()
      )
    `;
    // Existing workspaces tables may predate domain columns.
    await sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS custom_domain text,
        ADD COLUMN IF NOT EXISTS custom_domain_verified boolean NOT NULL DEFAULT false
    `;
    await sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS slug text,
        ADD COLUMN IF NOT EXISTS default_community_slug text
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS workspaces_custom_domain_uidx
        ON public.workspaces (custom_domain)
        WHERE custom_domain IS NOT NULL
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS workspaces_user_idx
        ON public.workspaces (user_id)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

/** Normalize user-entered domain → hostname only. */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function isApexDomain(domain: string): boolean {
  const parts = domain.split('.').filter(Boolean);
  // e.g. yourname.se → apex; hub.yourname.se → subdomain
  return parts.length <= 2;
}

export function dnsInstructions(domain: string) {
  if (isApexDomain(domain)) {
    return {
      type: 'A' as const,
      host: '@',
      value: '76.76.21.21',
      note: 'Apex domain — point A record to Vercel',
    };
  }
  return {
    type: 'CNAME' as const,
    host: domain.split('.')[0] || 'www',
    value: 'cname.vercel-dns.com',
    note: 'Subdomain — point CNAME to Vercel',
  };
}

export async function getDomainForUser(userId: string): Promise<DomainRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureDomainsSchema();
  const rows = await sql`
    SELECT id, user_id, slug, default_community_slug, custom_domain, custom_domain_verified
    FROM public.workspaces
    WHERE user_id = ${userId}
      AND custom_domain IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  if (Array.isArray(rows) && rows[0]?.custom_domain) {
    const r = rows[0] as Record<string, unknown>;
    return {
      domain: String(r.custom_domain),
      verified: Boolean(r.custom_domain_verified),
      workspace_id: String(r.id),
      user_id: String(r.user_id),
      slug: (r.slug as string) || null,
      default_community_slug: (r.default_community_slug as string) || null,
    };
  }

  const profile = await sql`
    SELECT id, handle, custom_domain, custom_domain_verified
    FROM public.profiles
    WHERE id = ${userId}
      AND custom_domain IS NOT NULL
    LIMIT 1
  `;
  if (Array.isArray(profile) && profile[0]?.custom_domain) {
    const r = profile[0] as Record<string, unknown>;
    const handle = String(r.handle || '')
      .replace(/^@/, '')
      .trim();
    return {
      domain: String(r.custom_domain),
      verified: Boolean(r.custom_domain_verified),
      workspace_id: null,
      user_id: userId,
      slug: handle || null,
      default_community_slug: handle || null,
    };
  }
  return null;
}

export async function resolveDomainHost(host: string): Promise<DomainRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const domain = normalizeDomain(host);
  if (!domain) return null;
  await ensureDomainsSchema();

  const ws = await sql`
    SELECT id, user_id, slug, default_community_slug, custom_domain, custom_domain_verified
    FROM public.workspaces
    WHERE lower(custom_domain) = ${domain}
    LIMIT 1
  `;
  if (Array.isArray(ws) && ws[0]) {
    const r = ws[0] as Record<string, unknown>;
    return {
      domain: String(r.custom_domain),
      verified: Boolean(r.custom_domain_verified),
      workspace_id: String(r.id),
      user_id: String(r.user_id),
      slug: (r.slug as string) || null,
      default_community_slug: (r.default_community_slug as string) || null,
    };
  }

  const profile = await sql`
    SELECT id, handle, custom_domain, custom_domain_verified
    FROM public.profiles
    WHERE lower(custom_domain) = ${domain}
    LIMIT 1
  `;
  if (Array.isArray(profile) && profile[0]) {
    const r = profile[0] as Record<string, unknown>;
    const handle = String(r.handle || '')
      .replace(/^@/, '')
      .trim();
    return {
      domain: String(r.custom_domain),
      verified: Boolean(r.custom_domain_verified),
      workspace_id: null,
      user_id: String(r.id),
      slug: handle || null,
      default_community_slug: handle || null,
    };
  }
  return null;
}

export async function saveCustomDomain(input: {
  userId: string;
  workspaceId: string;
  domain: string;
  slug?: string | null;
  workspaceName?: string | null;
  verified?: boolean;
}): Promise<DomainRecord> {
  await ensureDomainsSchema();
  const domain = normalizeDomain(input.domain);
  const slug = (input.slug || '').replace(/^@/, '').trim() || null;
  const verified = Boolean(input.verified);

  await sql`
    INSERT INTO public.workspaces (
      id, user_id, name, slug, default_community_slug,
      custom_domain, custom_domain_verified, updated_at
    )
    VALUES (
      ${input.workspaceId},
      ${input.userId},
      ${input.workspaceName ?? null},
      ${slug},
      ${slug},
      ${domain},
      ${verified},
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      name = COALESCE(EXCLUDED.name, workspaces.name),
      slug = COALESCE(EXCLUDED.slug, workspaces.slug),
      default_community_slug = COALESCE(EXCLUDED.default_community_slug, workspaces.default_community_slug),
      custom_domain = EXCLUDED.custom_domain,
      custom_domain_verified = EXCLUDED.custom_domain_verified,
      updated_at = now()
  `;

  await sql`
    UPDATE public.profiles
    SET
      custom_domain = ${domain},
      custom_domain_verified = ${verified},
      updated_at = now()
    WHERE id = ${input.userId}
  `;

  return {
    domain,
    verified,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    slug,
    default_community_slug: slug,
  };
}

export async function clearCustomDomain(input: {
  userId: string;
  workspaceId?: string | null;
  domain?: string | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensureDomainsSchema();

  if (input.workspaceId) {
    await sql`
      UPDATE public.workspaces
      SET custom_domain = NULL, custom_domain_verified = false, updated_at = now()
      WHERE id = ${input.workspaceId} AND user_id = ${input.userId}
    `;
  } else if (input.domain) {
    const domain = normalizeDomain(input.domain);
    await sql`
      UPDATE public.workspaces
      SET custom_domain = NULL, custom_domain_verified = false, updated_at = now()
      WHERE user_id = ${input.userId} AND lower(custom_domain) = ${domain}
    `;
  } else {
    await sql`
      UPDATE public.workspaces
      SET custom_domain = NULL, custom_domain_verified = false, updated_at = now()
      WHERE user_id = ${input.userId}
    `;
  }

  await sql`
    UPDATE public.profiles
    SET custom_domain = NULL, custom_domain_verified = false, updated_at = now()
    WHERE id = ${input.userId}
  `;
}

export async function setDomainVerified(input: {
  userId: string;
  domain: string;
  verified: boolean;
}): Promise<void> {
  await ensureDomainsSchema();
  const domain = normalizeDomain(input.domain);
  await sql`
    UPDATE public.workspaces
    SET custom_domain_verified = ${input.verified}, updated_at = now()
    WHERE user_id = ${input.userId} AND lower(custom_domain) = ${domain}
  `;
  await sql`
    UPDATE public.profiles
    SET custom_domain_verified = ${input.verified}, updated_at = now()
    WHERE id = ${input.userId} AND lower(custom_domain) = ${domain}
  `;
}
