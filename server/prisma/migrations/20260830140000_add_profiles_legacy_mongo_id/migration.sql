-- Hand-written migration (not generated via `prisma migrate diff --shadow-database-url`).
--
-- `prisma migrate dev` / `migrate diff --shadow-database-url` cannot be used against a
-- throwaway shadow database for this project right now: the only Postgres available
-- locally is another project's live Supabase stack (source-one-portal), and pointing
-- Prisma's shadow-database flow at any real/live database resets it -- exactly what
-- happened once before to this project's own database (see the incident documented at
-- the top of `20260830100425_init/migration.sql`'s companion RLS migration). For a
-- single nullable, unique text column, hand-writing the SQL is both safer and trivial.
--
-- Adds profiles.legacy_mongo_id: the Mongo `_id` hex string of the pre-migration Mongo
-- user this profile corresponds to. Nullable (not every future profile will have a
-- Mongo counterpart) and unique (each Mongo user maps to at most one Postgres profile).
-- Lets the auth middleware hand unported Mongo-backed services an id they can use during
-- the strangler transition, since req.user.id is now a Postgres UUID that never matches
-- a Mongo ObjectId.

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "legacy_mongo_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_legacy_mongo_id_key" ON "profiles"("legacy_mongo_id");
