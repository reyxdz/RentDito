/**
 * Shared shaper for a full `Profile` row embedded via an UNQUALIFIED
 * `include: { <relation>: true }` (no field `select`, so the whole row comes
 * back) -- as opposed to a narrow `select: { id, name, ... }` projection,
 * which excludes `legacyMongoId` by construction and needs no shaping here.
 *
 * `legacyMongoId` is internal migration bookkeeping: it maps a Postgres
 * profile back to its pre-migration Mongo `_id` so not-yet-ported services
 * (which still resolve `req.user.id` against Mongo, see
 * `src/middleware/auth.ts`) keep working during the strangler transition. It
 * must never cross the response boundary -- see `serialize.ts`'s
 * `NEVER_SERIALIZE_PROFILE_FIELDS`, the denylist `serializeProfile()` applies
 * for every top-level profile response. A full-row-embed path like this one
 * spreads the whole `Profile` row directly rather than going through
 * `serializeProfile()`, so it does not get that denylist for free -- this
 * helper is the equivalent protection for the embedded case.
 *
 * Originally written as a private `shapeEmbeddedProfile()` inside
 * visit.service.ts (task 18) after a live proof caught `legacyMongoId`
 * leaking through `remapFullVisit`'s embedded `userId`/`assignedStaffId`.
 * That same task's report flagged the identical latent leak in
 * `inquiry.service.ts`'s `remapFullPopulate()` (no fixture exercised its
 * `createInquiry`/`updateInquiryStatus` return shape to catch it there).
 * Promoted here so every service that embeds a full Profile row this way
 * shares one implementation instead of each maintaining its own copy --
 * there are more ports still to come, and per-service vigilance already
 * missed this once.
 *
 * Also drops any null-valued key from the row, mirroring Mongoose's "unset
 * optional path -> key entirely absent" convention (the same convention
 * every per-service `stripNulls()` helper in this migration already
 * applies to non-Profile embeds).
 */
export function shapeEmbeddedProfile(row: Record<string, unknown>): Record<string, unknown> {
  const { legacyMongoId, ...rest } = row;
  const out = rest as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (out[key] === null) delete out[key];
  }
  return out;
}
