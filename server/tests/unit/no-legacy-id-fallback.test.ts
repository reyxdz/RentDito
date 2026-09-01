import fs from 'fs';
import path from 'path';

/**
 * Guard against a dual-id fallback creeping back into a ported service.
 *
 * Binding architectural decision for this migration: transitional dual-id
 * complexity (resolving an entity by *either* its Postgres UUID *or* its
 * legacy Mongo ObjectId) lives ONLY in the test harness
 * (`tests/contract/replay-id-resolver.ts`), never in a production query
 * path. Production code takes a Postgres UUID and nothing else.
 *
 * That decision was quietly violated once already: `billing.service.ts`
 * grew a `resolveCallerProfile()` helper that fell back to
 * `prisma.profile.findUnique({ where: { legacyMongoId: userId } })` whenever
 * the incoming id wasn't UUID-shaped. The fallback was added to paper over
 * `payment.controller.ts` still passing the legacy Mongo id instead of the
 * Postgres UUID into a now-ported service -- and it worked well enough
 * that every fixture kept passing. That is exactly the danger: the
 * fallback silently absorbed a request from the wrong id space instead of
 * failing loudly, hiding a missed controller swap that should have been
 * caught by a red test, not a manual audit.
 *
 * This test scans every file under `server/src/services/` (recursively)
 * and fails if the literal token `legacyMongoId` appears anywhere outside
 * a comment. A comment mentioning `legacyMongoId` (e.g. to explain why a
 * response-shaping helper strips it) is fine and expected; an actual
 * reference -- a `where` clause, a property access, a destructure -- is
 * not, because the only reason production code would ever touch that
 * column is to resolve a caller by their legacy Mongo id, which is
 * precisely the fallback this migration has decided to ban from
 * production query paths.
 *
 * If this test just went red because you added a legitimate new
 * `legacyMongoId` reference: it isn't legitimate. Fix the real problem
 * instead -- find whichever controller call site is still passing the
 * wrong id space, and fix that. Do not restore the fallback and do not
 * delete this guard.
 */

const SERVICES_DIR = path.resolve(__dirname, '../../src/services');
const TOKEN = 'legacyMongoId';

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Strips `//` line comments and `/* *\/` block comments (including JSDoc)
 * from TypeScript source. Not a full parser -- doesn't account for the
 * token appearing inside a string or template literal -- but sufficient
 * here: no legitimate production code has any reason to spell
 * `legacyMongoId` inside a string either, so a hit there should still fail
 * loudly and get looked at.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

describe('no dual-id fallback in production services', () => {
  const files = listTsFiles(SERVICES_DIR);

  it('found at least one service file to scan (sanity check for the scan itself)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const relative = path.relative(SERVICES_DIR, file);
    it(`${relative} does not query by legacyMongoId`, () => {
      const source = fs.readFileSync(file, 'utf8');
      const code = stripComments(source);
      if (code.includes(TOKEN)) {
        throw new Error(
          `no-legacy-id-fallback: "${relative}" references "${TOKEN}" outside a ` +
            `comment. Production services must accept only a Postgres UUID -- the ` +
            `dual-id fallback (try the UUID, fall back to the legacy Mongo id) was ` +
            `deliberately banned from production query paths in this migration ` +
            `because it silently absorbs a caller that's still passing the wrong ` +
            `id space, hiding a missed controller swap that should fail loudly ` +
            `instead. Fix the controller call site that's still passing the Mongo ` +
            `id; do not reintroduce this fallback.`
        );
      }
    });
  }
});
