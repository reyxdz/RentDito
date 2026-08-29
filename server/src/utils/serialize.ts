import { Prisma } from '@prisma/client';

const isDecimal = (v: unknown): v is Prisma.Decimal =>
  v instanceof Prisma.Decimal;

/**
 * Recursively prepare a Prisma result for JSON output:
 *  - mirrors `id` into `_id` so existing client code keeps working
 *  - converts Decimal to number, matching what Mongo used to emit
 * Dates are left as Date instances; Express serializes them to ISO strings.
 */
const walk = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (isDecimal(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(walk);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v);
    }
    if (typeof out.id === 'string') out._id = out.id;
    return out;
  }
  return value;
};

export function serializeDoc<T extends object>(doc: T | null): Record<string, unknown> | null {
  if (doc === null || doc === undefined) return null;
  return walk(doc) as Record<string, unknown>;
}

export function serializeList<T extends object>(docs: T[]): Record<string, unknown>[] {
  return docs.map((d) => walk(d) as Record<string, unknown>);
}
