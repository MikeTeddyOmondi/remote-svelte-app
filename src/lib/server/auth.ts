import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import { getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { LOCCI_ISSUER, LOCCI_PROVIDER_ID, locciProvider } from '$lib/server/locci';

/**
 * `better-auth/minimal` (not `better-auth`) is deliberate: the default entrypoint
 * pulls in Kysely, which does not run on Cloudflare Workers.
 */

/**
 * Builds the auth instance for one request.
 *
 * `origin` is passed in from `hooks.server.ts` rather than read only from `env`
 * so that a missing/mismatched `ORIGIN` cannot silently break cookies and CSRF
 * checks in a deployed Worker — the previous setup failed exactly that way,
 * because `$env/dynamic/private` resolves from `.env` under `vite dev` but from
 * the Worker env in production.
 */
export const createAuth = (d1: D1Database, origin: string) => {
	const baseURL = env.ORIGIN || origin;

	return betterAuth({
		baseURL,
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [baseURL, origin],
		database: drizzleAdapter(getDb(d1), { provider: 'sqlite' }),
		emailAndPassword: { enabled: true },
		account: {
			accountLinking: {
				enabled: true,
				// Locci owns its users' email addresses, so an existing
				// email/password account may be linked to it on sign-in.
				trustedProviders: [LOCCI_PROVIDER_ID]
			}
		},
		plugins: [
			genericOAuth({ config: [locciProvider(env)] }),
			// must stay last
			sveltekitCookies(getRequestEvent)
		]
	});
};

export { LOCCI_ISSUER, LOCCI_PROVIDER_ID };

/**
 * DO NOT USE!
 *
 * This instance exists only so the `better-auth` CLI can generate the Drizzle
 * schema (`pnpm auth:schema`). At runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!, 'http://localhost:5173');
