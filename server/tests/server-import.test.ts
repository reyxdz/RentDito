import prisma from '../src/config/prisma';

describe('server module', () => {
  it('does not bind a port or connect to a database on import, but still exports a usable express app', () => {
    // Spy on the real Prisma singleton's $connect BEFORE importing server.ts, so this
    // proves server.ts's module-load side effects never call it -- not merely that some
    // mock object was left untouched. server.ts only calls `prisma.$connect()` (and only
    // assigns the default export, the listening http.Server) inside
    // `if (require.main === module)`. If that guard were removed or inverted, both
    // assertions below fail immediately -- verified by sabotage (temporarily inverting the
    // guard while writing this test and confirming it goes red).
    const connectSpy = jest.spyOn(prisma, '$connect').mockResolvedValue(undefined as never);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serverModule = require('../src/server') as typeof import('../src/server');

    expect(serverModule.default).toBeUndefined();
    expect(connectSpy).not.toHaveBeenCalled();

    // Light sanity check that `app` is still a usable Express handler,
    // since later tasks pass it directly to supertest.
    expect(typeof serverModule.app).toBe('function');
    expect(typeof (serverModule.app as any).listen).toBe('function');

    connectSpy.mockRestore();
  });
});
