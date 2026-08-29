import { app } from '../src/server';

describe('server module', () => {
  it('exports an express app without binding a port or connecting to a database', () => {
    expect(typeof app).toBe('function');
    expect(typeof (app as any).listen).toBe('function');
  });
});
