import { Prisma } from '@prisma/client';
import { toHttpError } from '../../src/utils/prismaErrors';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '6.0.0' });

describe('toHttpError', () => {
  it('maps P2002 to 409', () => expect(toHttpError(known('P2002')).statusCode).toBe(409));
  it('maps P2025 to 404', () => expect(toHttpError(known('P2025')).statusCode).toBe(404));
  it('maps P2003 to 400', () => expect(toHttpError(known('P2003')).statusCode).toBe(400));
  it('maps unknown errors to 500', () => expect(toHttpError(new Error('x')).statusCode).toBe(500));
  it('passes through an error that already has a statusCode', () => {
    const e = Object.assign(new Error('nope'), { statusCode: 403 });
    expect(toHttpError(e).statusCode).toBe(403);
  });
});
