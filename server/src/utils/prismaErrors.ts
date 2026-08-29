import { Prisma } from '@prisma/client';

const CODE_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'A record with these values already exists' },
  P2025: { status: 404, message: 'Record not found' },
  P2003: { status: 400, message: 'Referenced record does not exist' },
};

export function toHttpError(e: unknown): Error & { statusCode: number } {
  if (e && typeof e === 'object' && 'statusCode' in e) {
    return e as Error & { statusCode: number };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = CODE_MAP[e.code];
    if (mapped) {
      return Object.assign(new Error(mapped.message), { statusCode: mapped.status });
    }
  }
  return Object.assign(
    new Error(e instanceof Error ? e.message : 'Internal server error'),
    { statusCode: 500 }
  );
}
