/**
 * Regression test for a ticket-ownership access-control bug.
 *
 * `getTicketById` (src/services/ticket.service.ts) fetches the ticket and its
 * relations. `canAccessTicket`'s ownership check used to do
 * `ticket.reportedByUserId.toString() === userId`, which — once the ticket
 * had been populated/included alongside its `reportedBy` relation — could
 * stringify to something that never equals a real userId. The net effect:
 * the ticket's own reporter got a 403 from their own `GET /api/tickets/:id`,
 * forcing them through the management branch of `canAccessTicket` (which
 * they don't qualify for as a plain tenant), so every tenant was permanently
 * locked out of their own tickets.
 *
 * This was captured (frozen, not fixed) in tests/golden/ticket.json's
 * `ticket-by-id-owner-user1` case. Fixed by comparing the RAW scalar
 * `reportedByUserId` column against `userId` — never a stringified relation
 * object — the same idiom `verifyPropertyManagementAccess`'s own
 * `property.landlordId === userId` check already uses one line below it.
 *
 * POST-PORT (Task 25, ticket.service.ts moved Mongoose -> Prisma): this test
 * now resolves its reporter/ticket fixtures directly from POSTGRES via the
 * `prisma` singleton, not MongoDB. `ticket.service.ts` is Postgres-only from
 * this task onward (per this migration's "take only the Postgres UUID" rule
 * — no `legacyMongoId` fallback), so hitting the route with a Mongo
 * ObjectId would 404 before the ownership check under test ever runs,
 * which would silently stop this file from guarding anything. Resolving
 * against Postgres is the same "service is ported -> resolve against the
 * store it actually reads" rule `tests/contract/replay-id-resolver.ts`
 * already applies for the golden-fixture replay suite, applied here by
 * hand for this one hand-written regression test. Every assertion below is
 * unchanged from before the port: 200, `success`, the ticket's own id, and
 * `reportedByUserId._id` equal to the reporter's own id — this still fails
 * loudly if the ownership bug ever comes back, it just no longer needs a
 * live MongoDB connection to do it.
 *
 * IMPORTANT — named import. See tests/server-import.test.ts /
 * tests/contract/replay.test.ts: `server.ts` only calls connectDB() /
 * app.listen() under `if (require.main === module)`, so the default export
 * is `undefined` on import; only the named `{ app }` export is usable here.
 *
 * Tokens are minted via tests/helpers/auth.ts's `tokenForEmail`, not by
 * logging in over HTTP — POST /api/auth/login is rate-limited to 10
 * requests / 15 minutes (src/middleware/rateLimiter.ts), and the replay
 * suite alone already spends a chunk of that budget.
 */
import request from 'supertest';
import { app } from '../../src/server';
import { tokenForEmail } from '../helpers/auth';
import prisma from '../../src/config/prisma';

describe('GET /api/tickets/:id — reporter self-access', () => {
  it("lets the ticket's own reporter (a tenant) fetch their own ticket", async () => {
    const reporter = await prisma.profile.findFirst({ where: { email: 'user1@rentdito.com' } });
    if (!reporter) {
      throw new Error(
        'Seeded profile user1@rentdito.com not found — is Postgres seeded (npm run seed:pg)?'
      );
    }

    const ticket = await prisma.ticket.findFirst({ where: { reportedByUserId: reporter.id } });
    if (!ticket) {
      throw new Error(
        'No ticket reported by user1@rentdito.com found in the seeded Postgres data — cannot ' +
          'exercise the owner-access path.'
      );
    }

    const token = await tokenForEmail('user1@rentdito.com');

    const res = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data._id).toBe(ticket.id);
    // reportedByUserId comes back populated (an object), not the raw id.
    expect(res.body.data.reportedByUserId._id).toBe(reporter.id);
  });
});
