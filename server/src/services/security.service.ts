import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';

// NOTE on propertyRef.mapper.ts / embeddedProfile.mapper.ts (listed as
// "existing utilities to use" for this port): neither applies here. Both
// relation embeds this file makes (`reportedBy`, `propertyId`) are the SAME
// narrow selects the original's `.populate('reportedBy', 'name email')` /
// `.populate('propertyId', 'name')` used -- narrower than
// `propertyRef.mapper.ts`'s `{id, name, address}` shape, so that shared
// mapper would over-fetch fields this file's own fixture (`{_id, name}`
// only) never asked for; a narrow select already excludes `legacyMongoId`
// by construction, so `shapeEmbeddedProfile()` (built for full-row embeds)
// isn't the right tool either. No child-table
// (`tenancy_comments`/`unit_slots`/`ticket_updates`/
// `conversation_participants`/`message_reads`) is reachable from this file.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

const REPORTER_SELECT = { id: true, name: true, email: true } satisfies Prisma.ProfileSelect;
const PROPERTY_NAME_SELECT = { id: true, name: true } satisfies Prisma.PropertySelect;

function remapIncidentRelations<T extends {
  propertyId: string;
  reportedBy: string;
  property?: unknown;
  reporter?: unknown;
}>(row: T) {
  const { property, reporter, ...rest } = row;
  // Strip null-valued top-level keys (e.g. `resolutionNotes` when unset),
  // mirroring Mongoose's "unset optional path -> key entirely absent"
  // convention -- same fix inventory.service.ts's own task report
  // documents needing for the identical class of leak (nested embeds were
  // covered, the top-level `...rest` spread was not).
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== null) out[key] = value;
  }
  if (property !== undefined) out.propertyId = property;
  if (reporter !== undefined) out.reportedBy = reporter;
  return out;
}

// Incident Reports

export const getIncidentReports = async (filters: {
  propertyId?: string;
  status?: string;
  severity?: string;
  type?: string;
}) => {
  const where: Prisma.IncidentReportWhereInput = {};
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.status) where.status = filters.status as Prisma.IncidentReportWhereInput['status'];
  if (filters.severity) where.severity = filters.severity as Prisma.IncidentReportWhereInput['severity'];
  if (filters.type) where.type = filters.type as Prisma.IncidentReportWhereInput['type'];

  // A `propertyId` filter shaped like a Mongo id (or otherwise not a valid
  // Postgres UUID) can never match a real row -- short-circuit to an empty
  // list rather than letting Prisma's `@db.Uuid` validation throw P2023 on
  // the equality filter (the task-14 malformed-id trap, applied to a query
  // filter rather than a path id).
  if (typeof where.propertyId === 'string' && !isValidId(where.propertyId)) {
    return [];
  }

  const incidents = await prisma.incidentReport.findMany({
    where,
    include: {
      reporter: { select: REPORTER_SELECT },
      property: { select: PROPERTY_NAME_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(incidents.map(remapIncidentRelations));
};

export const getIncidentReportById = async (id: string) => {
  if (!isValidId(id)) {
    return null;
  }

  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: {
      reporter: { select: REPORTER_SELECT },
      property: { select: PROPERTY_NAME_SELECT },
    },
  });
  if (!incident) return null;

  return serializeDoc(remapIncidentRelations(incident));
};

export const createIncidentReport = async (data: {
  propertyId: string;
  reportedBy: string;
  dateOfIncident: string | Date;
  type: string;
  severity: string;
  description: string;
  status?: string;
  resolutionNotes?: string;
  attachments?: string[];
}) => {
  try {
    // No populate after create in the original (`new IncidentReport(data).save()`
    // returns the unpopulated doc), so `propertyId`/`reportedBy` stay raw
    // scalar ids here -- matching that exactly.
    const created = await prisma.incidentReport.create({
      data: {
        propertyId: data.propertyId,
        reportedBy: data.reportedBy,
        dateOfIncident: new Date(data.dateOfIncident),
        type: data.type as Prisma.IncidentReportCreateInput['type'],
        severity: data.severity as Prisma.IncidentReportCreateInput['severity'],
        description: data.description,
        status: data.status as Prisma.IncidentReportCreateInput['status'] | undefined,
        resolutionNotes: data.resolutionNotes,
        attachments: data.attachments ?? [],
      },
    });

    return serializeDoc(created);
  } catch (e) {
    throw toHttpError(e);
  }
};

export const updateIncidentReport = async (
  id: string,
  updates: Partial<{
    propertyId: string;
    reportedBy: string;
    dateOfIncident: string | Date;
    type: string;
    severity: string;
    description: string;
    status: string;
    resolutionNotes: string;
    attachments: string[];
  }>
) => {
  if (!isValidId(id)) {
    return null;
  }

  const data: Prisma.IncidentReportUpdateInput = {};
  if (updates.propertyId !== undefined) data.property = { connect: { id: updates.propertyId } };
  if (updates.reportedBy !== undefined) data.reporter = { connect: { id: updates.reportedBy } };
  if (updates.dateOfIncident !== undefined) data.dateOfIncident = new Date(updates.dateOfIncident);
  if (updates.type !== undefined) data.type = updates.type as Prisma.IncidentReportUpdateInput['type'];
  if (updates.severity !== undefined) data.severity = updates.severity as Prisma.IncidentReportUpdateInput['severity'];
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.status !== undefined) data.status = updates.status as Prisma.IncidentReportUpdateInput['status'];
  if (updates.resolutionNotes !== undefined) data.resolutionNotes = updates.resolutionNotes;
  if (updates.attachments !== undefined) data.attachments = updates.attachments;

  try {
    // No populate after update in the original (`findByIdAndUpdate(...,
    // {new:true})` returns the unpopulated doc) -- matching that exactly.
    const updated = await prisma.incidentReport.update({ where: { id }, data });
    return serializeDoc(updated);
  } catch (e) {
    const err = toHttpError(e);
    if (err.statusCode === 404) return null;
    throw err;
  }
};

export const deleteIncidentReport = async (id: string) => {
  if (!isValidId(id)) {
    return null;
  }

  try {
    const deleted = await prisma.incidentReport.delete({ where: { id } });
    return serializeDoc(deleted);
  } catch (e) {
    const err = toHttpError(e);
    if (err.statusCode === 404) return null;
    throw err;
  }
};

// Emergency Contacts

/**
 * Mongoose auto-assigns an `_id` to every element of the
 * `Property.emergencyContacts` embedded-array subdocument. Postgres stores
 * it as plain `jsonb` with no per-element identity, so one is minted fresh
 * on every read -- identical to property.service.ts's/user.service.ts's/
 * public.service.ts's own `withSubdocIds` helper, duplicated here rather
 * than imported (this file exports no shared helpers, matching this
 * migration's established per-file-duplication convention).
 */
function withSubdocIds<T extends object>(items: T[] | null | undefined): (T & { _id: string })[] {
  return (items ?? []).map((item) => ({ ...item, _id: randomUUID() }));
}

export const getEmergencyContacts = async (propertyId: string) => {
  // The original's error here is a plain `new Error(...)` with NO
  // `statusCode` set, which falls through `errorHandler`'s `err.statusCode
  // || 500` to a 500 -- preserved exactly (not "fixed" to a 404), including
  // for a malformed/Mongo-shaped id, which would otherwise throw a
  // differently-shaped Prisma P2023 error instead of this one.
  if (!isValidId(propertyId)) {
    throw new Error('Property not found');
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { emergencyContacts: true },
  });
  if (!property) throw new Error('Property not found');

  return withSubdocIds((property.emergencyContacts as Record<string, unknown>[] | null) ?? []);
};

export const updateEmergencyContacts = async (propertyId: string, contacts: unknown[]) => {
  if (!isValidId(propertyId)) {
    throw new Error('Property not found');
  }

  try {
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { emergencyContacts: contacts as Prisma.InputJsonValue },
      select: { emergencyContacts: true },
    });

    return withSubdocIds((property.emergencyContacts as Record<string, unknown>[] | null) ?? []);
  } catch (e) {
    const err = toHttpError(e);
    if (err.statusCode === 404) throw new Error('Property not found');
    throw err;
  }
};
