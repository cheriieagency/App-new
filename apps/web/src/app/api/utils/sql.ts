import { neon, NeonQueryFunction } from '@neondatabase/serverless';

type SqlQueryFunction = NeonQueryFunction<false, false> & {
  query: NeonQueryFunction<false, false>;
};

/**
 * Demo / local fallback when DATABASE_URL is missing.
 * Resolves to an empty result set so API routes can fall through to mocks
 * without throwing on every request.
 */
const emptyResult = async () => [] as Record<string, unknown>[];

const DemoQueryFunction = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
  void strings;
  return emptyResult();
}) as any as SqlQueryFunction;

DemoQueryFunction.transaction = (async () => []) as any;
DemoQueryFunction.query = DemoQueryFunction;

const databaseUrl = process.env.DATABASE_URL?.trim();
const sql = (
  databaseUrl ? neon(databaseUrl) : DemoQueryFunction
) as SqlQueryFunction;
sql.query = sql;

export default sql;
