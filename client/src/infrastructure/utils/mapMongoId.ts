/**
 * Map MongoDB `_id` field to the client-side `id` field.
 * Use this when transforming raw backend documents for client consumption.
 */
export function mapMongoId<T extends Record<string, any>>(doc: T): T & { id: string } {
  return { ...doc, id: (doc as any)._id || doc.id };
}
