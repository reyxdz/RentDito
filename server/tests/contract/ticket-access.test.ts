/**
 * Regression test for a ticket-ownership access-control bug.
 *
 * `getTicketById` (src/services/ticket.service.ts) fetches the ticket through
 * `populateTicket()`, which `.populate('reportedByUserId', ...)`s it into a
 * user document. `canAccessTicket`'s ownership check used to do
 * `ticket.reportedByUserId.toString() === userId`, which — for a populated
 * object — stringifies to the literal `"[object Object]"` and can never equal
 * a real userId. The net effect: the ticket's own reporter got a 403 from
 * their own `GET /api/tickets/:id`, forcing them through the management
 * branch of `canAccessTicket` (which they don't qualify for as a plain
 * tenant), so every tenant was permanently locked out of their own tickets.
 *
 * This was captured (frozen, not fixed) in tests/golden/ticket.json's
 * `ticket-by-id-owner-user1` case. Fixed in ticket.service.ts by reading
 * `ticket.reportedByUserId._id` first (falling back to the raw value), the
 * same populated-or-raw idiom already used one line below for `propertyId`.
 * The fixture was re-captured afterwards to reflect the corrected 200.
 *
 * IMPORTANT — named import. See tests/server-import.test.ts /
 * tests/contract/replay.test.ts: `server.ts` only calls connectDB() /
 * app.listen() under `if (require.main === module)`, so the default export
 * is `undefined` on import; only the named `{ app }` export is usable here.
 * This file owns its own MongoDB connection for the same reason.
 *
 * Tokens are minted via tests/helpers/auth.ts's `tokenForEmail`, not by
 * logging in over HTTP — POST /api/auth/login is rate-limited to 10
 * requests / 15 minutes (src/middleware/rateLimiter.ts), and the replay
 * suite alone already spends a chunk of that budget.
 */
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/server';
import { tokenForEmail } from '../helpers/auth';
import { Ticket } from '../../src/models/Ticket';
import { User } from '../../src/models/User';

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/rentdito');
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('GET /api/tickets/:id — reporter self-access', () => {
  it("lets the ticket's own reporter (a tenant) fetch their own ticket", async () => {
    const reporter: any = await User.findOne({ email: 'user1@rentdito.com' }).lean();
    if (!reporter) {
      throw new Error(
        'Seeded user user1@rentdito.com not found — is MongoDB seeded (npm run seed)?'
      );
    }

    const ticket: any = await Ticket.findOne({ reportedByUserId: reporter._id }).lean();
    if (!ticket) {
      throw new Error(
        'No ticket reported by user1@rentdito.com found in the seeded data — cannot exercise ' +
          'the owner-access path.'
      );
    }

    const token = await tokenForEmail('user1@rentdito.com');

    const res = await request(app)
      .get(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data._id).toBe(ticket._id.toString());
    // reportedByUserId comes back populated (an object), not the raw id.
    expect(res.body.data.reportedByUserId._id).toBe(reporter._id.toString());
  });
});
