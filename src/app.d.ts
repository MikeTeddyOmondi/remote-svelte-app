import type { User, Session } from 'better-auth';
import type { createAuth } from '$lib/server/auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			user?: User;
			session?: Session;
			/**
			 * Only present once `hooks.server.ts` has seen the D1 binding, i.e. never
			 * during prerendering. Guard with `locals.auth` before use, or call
			 * `requireAuth()` from `$lib/server/auth-guard`.
			 */
			auth?: ReturnType<typeof createAuth>;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
