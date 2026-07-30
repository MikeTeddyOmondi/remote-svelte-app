import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Studio against the LOCAL miniflare D1 — the database `vite dev` and
 * `wrangler dev` actually use.
 *
 * `drizzle.config.ts` uses `driver: 'd1-http'`, which can only reach the remote
 * D1. There is no local D1 driver, but miniflare stores each database as an
 * ordinary SQLite file, so we point the plain `sqlite` dialect straight at it.
 *
 * The filename is a hash derived from the binding, so it is resolved at runtime
 * rather than hardcoded.
 */
const STATE_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

/**
 * Miniflare names each database after a hash of its binding, and keeps its own
 * `metadata.sqlite` in the same directory — so match the hash, not `*.sqlite`.
 */
const DB_FILE = /^[0-9a-f]{64}\.sqlite$/;

function findLocalDatabase(): string {
	let files: string[];
	try {
		files = readdirSync(STATE_DIR).filter((f) => DB_FILE.test(f));
	} catch {
		throw new Error(
			`No local D1 state at ${STATE_DIR}.\n` +
				`Run \`pnpm db:migrate:local\` (and start the dev server once) first.`
		);
	}

	if (files.length === 0) {
		throw new Error(`No .sqlite file in ${STATE_DIR}. Run \`pnpm db:migrate:local\` first.`);
	}
	if (files.length > 1) {
		throw new Error(
			`Expected one database in ${STATE_DIR}, found ${files.length}: ${files.join(', ')}`
		);
	}

	// `file:` prefix: drizzle-kit connects through @libsql/client, which requires
	// a URL rather than a bare path.
	return `file:${resolve(join(STATE_DIR, files[0]))}`;
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: findLocalDatabase() },
	verbose: true,
	strict: true
});
