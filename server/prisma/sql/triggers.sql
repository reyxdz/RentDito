-- =============================================================================
-- Raw-SQL additions to the initial migration (20260830100425_init).
--
-- This file is the readable, reviewable source of truth for everything Prisma
-- cannot express in schema.prisma. Its contents are appended verbatim to the
-- end of `prisma/migrations/20260830100425_init/migration.sql`, which is what
-- Prisma Migrate actually executes. Keep the two in sync: editing this file
-- alone changes nothing.
--
-- Contents:
--   1. Three partial UNIQUE indexes (Mongoose partial-unique indexes)
--   2. refresh_property_metrics() + trigger (replaces the four Unit.post hooks)
--   3. 27 CHECK constraints (Mongoose min/max validators)
--   4. citext on profiles.email (Mongoose lowercase:true + unique)
--   5. profiles.id -> auth.users.id FK (Supabase-owned schema)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Partial unique indexes
--    Prisma cannot express a WHERE clause on a unique index, so these three
--    Mongoose partial-unique indexes must be created in raw SQL or the
--    uniqueness guarantees carried over from Mongo are silently lost.
-- -----------------------------------------------------------------------------

-- Bill.ts: one auto-generated bill per tenancy/type/billing period.
CREATE UNIQUE INDEX "bills_auto_period_uniq"
  ON "bills" ("tenancy_id", "type", "billing_period_start", "billing_period_end")
  WHERE "is_auto_generated";

-- RentalApplication.ts: one live application per (user, unit).
CREATE UNIQUE INDEX "rental_applications_active_uniq"
  ON "rental_applications" ("user_id", "unit_id")
  WHERE "status" IN ('pending', 'under_review');

-- Inventory.ts: serial numbers unique per property, ignoring null/blank serials.
-- NOTE: the table is `inventories` (Prisma pluralised the `Inventory` model),
-- not `inventory`.
CREATE UNIQUE INDEX "inventory_serial_uniq"
  ON "inventories" ("property_id", "serial_number")
  WHERE "serial_number" IS NOT NULL AND "serial_number" <> '';


-- -----------------------------------------------------------------------------
-- 2. Property occupancy metrics trigger
--
--    Replaces the four UnitSchema.post() hooks (save / findOneAndUpdate /
--    findOneAndDelete / deleteOne) in the Mongoose model. Doing it in the
--    database also closes the deleteMany gap the original code documents as a
--    known limitation: a bulk delete bypassed the document middleware and left
--    properties.total_units stale. A row-level trigger cannot be bypassed.
--
--    Two deliberate deviations from the plan's draft:
--
--    a) The draft used
--         target UUID := COALESCE(NEW.property_id, OLD.property_id);
--       In PL/pgSQL, NEW is unassigned during DELETE and OLD is unassigned
--       during INSERT; touching the unassigned record raises
--       'record "new" is not assigned yet', so the draft would have failed on
--       every DELETE. TG_OP is checked instead.
--
--    b) The draft refreshed a single property. An UPDATE that moves a unit
--       between properties has to refresh both the old and the new one, or the
--       source property keeps stale counts forever. Both ids are collected and
--       de-duplicated.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_property_metrics() RETURNS TRIGGER AS $$
DECLARE
  targets UUID[] := ARRAY[]::UUID[];
  target  UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    targets := targets || OLD.property_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    targets := targets || NEW.property_id;
  END IF;

  FOR target IN
    SELECT DISTINCT t FROM unnest(targets) AS t WHERE t IS NOT NULL
  LOOP
    UPDATE properties p SET
      total_units    = s.total,
      occupied_units = s.occupied,
      vacant_units   = s.vacant,
      occupancy_rate = CASE WHEN s.total > 0
                            THEN ROUND((s.occupied::numeric / s.total) * 100, 2)
                            ELSE 0 END
    FROM (
      SELECT
        COUNT(*)                                    AS total,
        COUNT(*) FILTER (WHERE status = 'occupied') AS occupied,
        COUNT(*) FILTER (WHERE status = 'vacant')   AS vacant
      FROM units WHERE property_id = target
    ) s
    WHERE p.id = target;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER units_refresh_property_metrics
  AFTER INSERT OR DELETE OR UPDATE OF status, property_id ON units
  FOR EACH ROW EXECUTE FUNCTION refresh_property_metrics();


-- -----------------------------------------------------------------------------
-- 3. CHECK constraints for the Mongoose min/max validators
--    27 validators that have no Prisma equivalent and would otherwise be
--    silently unenforced in Postgres, letting invalid data (negative rent,
--    zero-capacity units) become insertable post-cutover.
--    Nullable columns are guarded with `IS NULL OR`.
-- -----------------------------------------------------------------------------

ALTER TABLE properties
  ADD CONSTRAINT properties_billing_day_check CHECK (billing_day BETWEEN 1 AND 31),
  ADD CONSTRAINT properties_due_day_check CHECK (due_day BETWEEN 1 AND 31),
  ADD CONSTRAINT properties_late_fee_percent_check CHECK (late_fee_percent >= 0 AND late_fee_percent <= 100);

ALTER TABLE units
  ADD CONSTRAINT units_room_rent_check CHECK (room_rent IS NULL OR room_rent >= 0),
  ADD CONSTRAINT units_bedspace_rent_check CHECK (bedspace_rent IS NULL OR bedspace_rent >= 0),
  ADD CONSTRAINT units_per_head_rate_check CHECK (per_head_rate IS NULL OR per_head_rate >= 0),
  ADD CONSTRAINT units_deposit_check CHECK (deposit >= 0),
  ADD CONSTRAINT units_size_sqm_check CHECK (size_sqm IS NULL OR size_sqm >= 0),
  ADD CONSTRAINT units_capacity_check CHECK (capacity >= 1),
  ADD CONSTRAINT units_max_occupants_check CHECK (max_occupants >= 1);

ALTER TABLE contracts
  ADD CONSTRAINT contracts_lock_in_period_check CHECK (lock_in_period >= 0),
  ADD CONSTRAINT contracts_monthly_rent_check CHECK (monthly_rent >= 0),
  ADD CONSTRAINT contracts_security_deposit_check CHECK (security_deposit >= 0),
  ADD CONSTRAINT contracts_advance_payment_check CHECK (advance_payment >= 0);

ALTER TABLE bills
  ADD CONSTRAINT bills_rent_amount_check CHECK (rent_amount >= 0),
  ADD CONSTRAINT bills_utility_amount_check CHECK (utility_amount >= 0),
  ADD CONSTRAINT bills_penalty_amount_check CHECK (penalty_amount >= 0),
  ADD CONSTRAINT bills_total_amount_check CHECK (total_amount >= 0),
  ADD CONSTRAINT bills_paid_amount_check CHECK (paid_amount >= 0),
  ADD CONSTRAINT bills_balance_amount_check CHECK (balance_amount >= 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_check CHECK (amount >= 0.01);

ALTER TABLE tenancies
  ADD CONSTRAINT tenancies_slot_number_check CHECK (slot_number IS NULL OR slot_number >= 1);

ALTER TABLE inventories
  ADD CONSTRAINT inventories_quantity_check CHECK (quantity >= 1),
  ADD CONSTRAINT inventories_available_quantity_check CHECK (available_quantity >= 0),
  ADD CONSTRAINT inventories_purchase_cost_check CHECK (purchase_cost IS NULL OR purchase_cost >= 0);

ALTER TABLE inventory_records
  ADD CONSTRAINT inventory_records_quantity_issued_check CHECK (quantity_issued >= 1),
  ADD CONSTRAINT inventory_records_penalty_amount_check CHECK (penalty_amount IS NULL OR penalty_amount >= 0);


-- -----------------------------------------------------------------------------
-- 4. Case-insensitive email uniqueness
--
--    User.ts had `lowercase: true` in front of its unique index. A bare
--    `email TEXT UNIQUE` in Postgres is case-sensitive, so A@x.com and
--    a@x.com could coexist post-cutover -- a duplicate-account and
--    failed-login-match risk that did not exist under Mongo.
--
--    Retyping the column to citext makes the UNIQUE index Prisma already
--    generated (profiles_email_key) case-insensitive; Postgres rebuilds that
--    index automatically as part of the type change.
--
--    Supabase convention: extensions live in the `extensions` schema, never
--    `public`. The type is written schema-qualified so the statement does not
--    depend on `extensions` being on the migration engine's search_path.
--    CREATE SCHEMA IF NOT EXISTS keeps the migration replayable on a plain
--    Postgres shadow database, which has no `extensions` schema.
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
ALTER TABLE profiles ALTER COLUMN email TYPE extensions.citext;


-- -----------------------------------------------------------------------------
-- 5. profiles.id -> auth.users.id
--
--    Prisma does not manage the Supabase-owned `auth` schema, so without this
--    profiles.id is a bare UUID with no referential link to the Supabase Auth
--    user it names, and deleting an auth user leaves an orphaned profile.
--    ON DELETE CASCADE is deliberate: a profiles row has no meaning once its
--    owning auth.users row is gone.
--
--    Guarded on auth.users existing so the migration still replays on a plain
--    Postgres shadow database (which has no `auth` schema) -- without the
--    guard, every future `prisma migrate dev` in this repo would fail during
--    its shadow-database drift check. On the real Supabase database the branch
--    is always taken; a genuine failure to add the constraint still raises.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END
$$;
