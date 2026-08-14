/**
 * SQL helper for Next.js API routes.
 *
 * Uses Neon/Supabase WebSocket Pool — the neon() HTTP driver does NOT work
 * against Supabase pooler hosts (getaddrinfo ENOTFOUND api.pooler.supabase.com),
 * which silently broke every social_accounts upsert/list.
 */

import { neonConfig, Pool, type NeonQueryFunction } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

type SqlTagged = NeonQueryFunction<false, false> & {
  query: NeonQueryFunction<false, false>;
};

const emptyResult = async () => [] as Record<string, unknown>[];

const DemoQueryFunction = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
  void strings;
  return emptyResult();
}) as unknown as SqlTagged;
DemoQueryFunction.transaction = (async () => []) as SqlTagged['transaction'];
DemoQueryFunction.query = DemoQueryFunction;

const databaseUrl = process.env.DATABASE_URL?.trim();

let sql: SqlTagged = DemoQueryFunction;

if (databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });

  const tagged = (async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => {
    let text = '';
    const params: unknown[] = [];
    for (let i = 0; i < strings.length; i += 1) {
      text += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        text += `$${params.length}`;
      }
    }
    const result = await pool.query(text, params);
    return result.rows as Record<string, unknown>[];
  }) as unknown as SqlTagged;

  tagged.query = tagged;
  tagged.transaction = (async (queries: unknown) => {
    // Minimal transaction shim — run sequentially inside a client.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out: unknown[] = [];
      if (Array.isArray(queries)) {
        for (const q of queries) {
          // Neon-style: callers pass either lazy fns or already-started sql`` Promises.
          if (typeof q === 'function') {
            out.push(await q(tagged));
          } else if (q != null && typeof (q as Promise<unknown>).then === 'function') {
            out.push(await q);
          } else {
            out.push(q);
          }
        }
      }
      await client.query('COMMIT');
      return out;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }) as SqlTagged['transaction'];

  sql = tagged;
}

export default sql;
