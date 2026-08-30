-- Re-establish deny-by-default Row Level Security on every table in `public`.
--
-- Background: Supabase provisions new projects with an automatic-RLS
-- mechanism -- a SECURITY DEFINER function `public.rls_auto_enable()` plus a
-- `ddl_command_end` event trigger (`ensure_rls`) that calls it whenever a new
-- table is created. An earlier `prisma migrate diff --shadow-database-url`
-- invocation was accidentally pointed at the live database instead of a
-- throwaway one; Prisma's shadow-database flow *resets* whatever database it
-- is given, which dropped and recreated the `public` schema. The migration
-- itself replayed cleanly (all 27 tables came back byte-identical), but the
-- event trigger and its function are objects Supabase installs outside of
-- Prisma's migration history, so they were not replayed and are gone. As a
-- result RLS is currently enabled on 0 of 27 tables, and any table created
-- from here on would not get it automatically either.
--
-- The correct remedy is NOT to try to recreate `ensure_rls` /
-- `rls_auto_enable()`: `CREATE EVENT TRIGGER` requires superuser, and the
-- `postgres` role Prisma/Supabase run migrations as is not superuser on
-- Supabase. Instead this migration does the equivalent work explicitly and
-- idempotently, once, as part of the normal migration history:
--
--   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY on every base table in
--     `public` (except Prisma's own `_prisma_migrations` bookkeeping table).
--   - REVOKE ALL privileges on those same tables from the `anon` and
--     `authenticated` roles that Supabase's PostgREST / Data API use.
--
-- No policies are added. That is deliberate: this project's authorization
-- boundary is the Express API, which is the only client that talks to
-- Postgres as the `postgres` owner role. Owners bypass RLS entirely (RLS
-- restricts non-owner roles unless a table is also marked FORCE ROW LEVEL
-- SECURITY, which this migration does not do), so the Express API keeps
-- working exactly as before. RLS here is defence-in-depth for any other
-- Postgres role (`anon`, `authenticated`, or a future direct-to-Postgres
-- client) that might otherwise reach these tables through Supabase's Data
-- API or a leaked connection string: with RLS enabled and no policies, and
-- privileges revoked, every one of those roles sees zero rows and cannot
-- write, by default, until a policy is explicitly added.
--
-- Written as a DO block iterating pg_tables rather than 27 hand-written
-- ALTER/REVOKE pairs so it stays correct as tables are added or renamed by
-- future migrations, and so it is trivially re-runnable (ENABLE ROW LEVEL
-- SECURITY and REVOKE are both idempotent).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;', r.tablename);
  END LOOP;
END
$$;
