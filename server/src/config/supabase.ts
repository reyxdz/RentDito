import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// server.ts's own dotenv.config() runs AFTER its `import authRoutes ...` line
// (which transitively imports this file), so process.env would otherwise be
// unpopulated the first time this module's top-level checks run. Every other
// config module with load-time env reads (config/mailer.ts, config/cloudinary.ts)
// calls dotenv.config() itself for the same reason; dotenv.config() is safe to
// call more than once per process.
dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

/**
 * Admin (service-role) Supabase client. Server-side only — never expose the
 * service role key to the client. Used to create/sign in/manage auth users
 * and to send password-reset email via Supabase Auth (GoTrue).
 */
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
