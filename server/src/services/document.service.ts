import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';

// NOTE on propertyRef.mapper.ts / embeddedProfile.mapper.ts (listed as
// "existing utilities to use" for this port): neither applies here. The
// only relation this file ever embeds is `uploadedBy`, via the SAME narrow
// `{name, email}` select the original's `.populate('uploadedBy', 'name
// email')` used -- a narrow select excludes `legacyMongoId` by
// construction, so `shapeEmbeddedProfile()` (built for full-row embeds) is
// not the right tool, and `propertyRef.mapper.ts` doesn't apply since no
// Property is ever embedded here. No child-table
// (`tenancy_comments`/`unit_slots`/`ticket_updates`/
// `conversation_participants`/`message_reads`) is reachable from this file.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

const UPLOADER_SELECT = { id: true, name: true, email: true } satisfies Prisma.ProfileSelect;

/**
 * Direct port of `.populate('uploadedBy', 'name email')`: turns the scalar
 * `uploadedBy` FK into the populated `{_id, name, email}` object under the
 * SAME key, matching the relation-remapping pattern every prior port uses
 * (see property.service.ts's `remapLandlord`).
 */
function remapUploader<T extends { uploadedBy: string; uploader?: unknown }>(row: T) {
  if (row.uploader === undefined) return row;
  const { uploader, ...rest } = row;
  return { ...rest, uploadedBy: uploader };
}

export const getDocuments = async (filters: {
  propertyId?: string;
  unitId?: string;
  tenancyId?: string;
  type?: string;
  uploadedBy?: string;
}) => {
  const where: Prisma.DocumentWhereInput = {};
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.unitId) where.unitId = filters.unitId;
  if (filters.tenancyId) where.tenancyId = filters.tenancyId;
  if (filters.type) where.type = filters.type as Prisma.DocumentWhereInput['type'];
  if (filters.uploadedBy) where.uploadedBy = filters.uploadedBy;

  // Any filter value shaped like a Mongo id (or otherwise not a valid
  // Postgres UUID) can never match a real row -- short-circuit to an empty
  // list rather than letting Prisma's `@db.Uuid` validation throw P2023 on
  // the equality filter (the task-14 malformed-id trap, applied here to a
  // query filter rather than a path id).
  for (const key of ['propertyId', 'unitId', 'tenancyId', 'uploadedBy'] as const) {
    const value = where[key];
    if (typeof value === 'string' && !isValidId(value)) {
      return [];
    }
  }

  const documents = await prisma.document.findMany({
    where,
    include: { uploader: { select: UPLOADER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(documents.map(remapUploader));
};

export const getDocumentById = async (id: string) => {
  if (!isValidId(id)) {
    return null;
  }

  const document = await prisma.document.findUnique({
    where: { id },
    include: { uploader: { select: UPLOADER_SELECT } },
  });
  if (!document) return null;

  return serializeDoc(remapUploader(document));
};

export const createDocument = async (data: {
  propertyId: string;
  unitId?: string | null;
  tenancyId?: string | null;
  type: string;
  title: string;
  fileUrl: string;
  uploadedBy: string;
}) => {
  try {
    // No populate on create in the original (`new Document(data).save()`
    // returns the unpopulated doc), so `uploadedBy` stays a raw scalar id
    // here -- matching that exactly, not routed through `remapUploader`.
    const created = await prisma.document.create({
      data: {
        propertyId: data.propertyId,
        unitId: data.unitId ?? undefined,
        tenancyId: data.tenancyId ?? undefined,
        type: data.type as Prisma.DocumentCreateInput['type'],
        title: data.title,
        fileUrl: data.fileUrl,
        uploadedBy: data.uploadedBy,
      },
    });

    return serializeDoc(created);
  } catch (e) {
    throw toHttpError(e);
  }
};

export const deleteDocument = async (id: string) => {
  if (!isValidId(id)) {
    return null;
  }

  try {
    const deleted = await prisma.document.delete({ where: { id } });
    return serializeDoc(deleted);
  } catch (e) {
    const err = toHttpError(e);
    if (err.statusCode === 404) return null;
    throw err;
  }
};
