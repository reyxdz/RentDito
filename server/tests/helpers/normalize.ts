// 'to' added for src/services/financial.service.ts's summary `range.to`,
// which is `new Date()` (request time) — a live clock value that can never
// reproduce across runs, exactly like createdAt/updatedAt. It is the only
// place the key `to` appears anywhere in tests/golden/*.json (verified by
// grep across the fixture corpus), so stripping it globally carries no
// realistic risk of masking a real regression elsewhere.
const VOLATILE = new Set(['createdAt', 'updatedAt', '__v', 'timestamp', 'signedAt', 'to']);

/**
 * Keys whose array value's element order is not part of the API's actual
 * contract and can legitimately differ between two runs against identical
 * data. Concretely: src/services/admin.service.ts's `usersByRole` comes
 * from `User.aggregate([{ $group: { _id: '$role', count: ... } }])` with no
 * `$sort` stage — MongoDB does not guarantee $group bucket order, and it
 * was observed to differ between the original capture run and a replay run
 * against the exact same seed data. Sorting both sides by this key before
 * comparing makes the check order-independent, matching what the endpoint
 * actually guarantees (a set of role/count pairs, not a specific order).
 */
const UNORDERED_ARRAY_SORT_KEY: Record<string, string> = {
  usersByRole: 'role',
};

/**
 * Keys whose value is an array of raw id strings but whose name does not
 * end in "Id" (so the generic id-collapse rule below never catches it),
 * and whose raw value genuinely differs between the Mongo-captured fixture
 * and a Postgres-served replay purely because of WHICH id space identifies
 * the same real user -- not because of any behavioral difference.
 * `message.service.ts`'s ported `readBy` (Task 17, promoted from an
 * embedded `ObjectId[]` to the `message_reads` join table) is the first --
 * and, per a corpus-wide grep of tests/golden/*.json, only -- fixture value
 * shaped this way: it's an array of user ids, but "readBy" doesn't end in
 * "Id"/"Ids". Canonicalizing its elements to the same `'<ID>'` placeholder
 * every other id-shaped field already gets keeps the check "is this the
 * same set of readers", not "is it the byte-identical id across two
 * different id spaces" -- exactly the existing policy this file already
 * applies to `_id`/`...Id` keys, just extended to this one differently-named
 * field.
 */
const RAW_ID_ARRAY_KEYS = new Set(['readBy']);

/**
 * Strip fields that legitimately differ between runs or engines, and
 * canonicalise IDs to a placeholder so Mongo ObjectIds and Postgres UUIDs
 * compare equal by position rather than by value.
 *
 * IMPORTANT: this collapses both `id` and `_id` to the same `'<ID>'`
 * placeholder, which means it is USELESS for verifying that an object
 * carries a consistent, matching `id`/`_id` pair — by the time a body
 * reaches this function that information is already gone. Callers that
 * care about that invariant (see tests/contract/replay.test.ts's
 * `assertDualId`) MUST run that check on the raw response body BEFORE
 * calling normalizeBody, never after.
 */
export function normalizeBody(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(normalizeBody);
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    // Additive-alias handling: src/utils/serialize.ts's serializeDoc() (used
    // by every Prisma-ported service, starting with auth.service.ts) mirrors
    // Prisma's `id` into `_id` for backward compatibility with Mongo-shaped
    // consumers. The golden fixtures, however, were captured from raw
    // Mongoose output, which never emits `id` at all -- only `_id`. Once a
    // service is ported, every one of its entities gains this additive `id`
    // alongside the fixture's pre-existing `_id`, and a naive deep-equal
    // would fail on that extra key for a reason that has nothing to do with
    // whether the port itself is correct. So: when `_id` is present on this
    // object, treat `id` as a pure alias and drop it from the value
    // comparison entirely (never emitted into `out`).
    //
    // This does NOT weaken the "id and _id must both be present and equal"
    // Global Constraint -- that invariant is enforced separately, and
    // BEFORE this function ever runs, by tests/contract/replay.test.ts's
    // assertDualId() against the RAW (pre-normalize) response body (see
    // that function's call site and this file's header comment). By the
    // time a body reaches normalizeBody, assertDualId has already thrown if
    // `id` was present without a matching `_id`, or if the two disagreed --
    // this function only has to worry about `id` being an uninteresting
    // extra key once that structural check has already passed.
    const hasUnderscoreId = Object.prototype.hasOwnProperty.call(record, '_id');
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (k === 'id' && hasUnderscoreId) continue;
      if (VOLATILE.has(k)) continue;
      if (k === 'id' || k === '_id' || k.endsWith('Id')) {
        out[k] = typeof v === 'string' ? '<ID>' : normalizeBody(v);
        continue;
      }
      if (RAW_ID_ARRAY_KEYS.has(k) && Array.isArray(v)) {
        out[k] = (v as unknown[]).map((el) => (typeof el === 'string' ? '<ID>' : normalizeBody(el)));
        continue;
      }
      if (Array.isArray(v) && UNORDERED_ARRAY_SORT_KEY[k]) {
        const sortKey = UNORDERED_ARRAY_SORT_KEY[k];
        const sorted = [...(v as any[])].sort((a, b) =>
          String((a as any)?.[sortKey]).localeCompare(String((b as any)?.[sortKey]))
        );
        out[k] = sorted.map(normalizeBody);
        continue;
      }
      out[k] = normalizeBody(v);
    }
    return out;
  }
  return input;
}
