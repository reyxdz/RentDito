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
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (VOLATILE.has(k)) continue;
      if (k === 'id' || k === '_id' || k.endsWith('Id')) {
        out[k] = typeof v === 'string' ? '<ID>' : normalizeBody(v);
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
