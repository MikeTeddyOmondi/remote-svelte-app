import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import type { User } from 'better-auth';

/**
 * Remote functions are their own HTTP endpoints, reachable directly — a
 * `+layout.server.ts` guard does NOT protect them. Per the SvelteKit docs,
 * `url`/`route`/`params` inside a remote function describe the *calling page*
 * and are attacker-controlled, so they can never be used for authorization.
 *
 * Every remote function that touches user data must call `requireUser()`.
 */
export function requireUser(): User {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, 'Unauthorized');
	return locals.user;
}

/**
 * The auth instance for this request. Absent only when there is no D1 binding
 * (i.e. while prerendering), which no authenticated path should ever hit.
 */
export function requireAuth() {
	const { locals } = getRequestEvent();
	if (!locals.auth) error(500, 'Auth is unavailable for this request');
	return locals.auth;
}
