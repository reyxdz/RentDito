import mongoose from 'mongoose';
import server, { app } from '../src/server';

describe('server module', () => {
  it('does not bind a port or connect to a database on import, but still exports a usable express app', () => {
    // The default export (the listening http.Server) is only assigned
    // inside the `require.main === module` guard in server.ts. If that
    // guard were removed or inverted, `server` would be a real
    // http.Server here instead of undefined, and this assertion would
    // fail immediately.
    expect(server).toBeUndefined();

    // connectDB() is also inside the guard, so importing the module must
    // not open a MongoDB connection. readyState 0 === disconnected.
    expect(mongoose.connection.readyState).toBe(0);

    // Light sanity check that `app` is still a usable Express handler,
    // since later tasks pass it directly to supertest.
    expect(typeof app).toBe('function');
    expect(typeof (app as any).listen).toBe('function');
  });
});
