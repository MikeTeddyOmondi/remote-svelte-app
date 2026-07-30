import type { Handle, HandleValidationError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const d1 = event.platform?.env?.DB;

	// `platform` is absent while prerendering/building. Throwing here (as the
	// template did) crashes the build, so just pass the request through — no
	// prerendered route may touch auth anyway.
	if (!d1) {
		if (building) return resolve(event);
		throw new Error('D1 binding "DB" not found — are you running with the Cloudflare adapter?');
	}

	const auth = createAuth(d1, event.url.origin);
	event.locals.auth = auth;

	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	// Serves Better Auth's own routes under /api/auth/*, including the
	// generic-oauth callback at /api/auth/oauth2/callback/locci.
	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;

/**
 * Remote functions validate their arguments against a schema. A failure here is
 * either a version skew between client and server, or someone poking the
 * generated endpoints — neither deserves a detailed error.
 */
export const handleValidationError: HandleValidationError = () => ({
	message: 'Invalid request.'
});
