import * as v from 'valibot';
import { redirect, invalid } from '@sveltejs/kit';
import { form, query, getRequestEvent } from '$app/server';
import { APIError } from 'better-auth/api';
import { env } from '$env/dynamic/private';
import { requireAuth } from '$lib/server/auth-guard';
import { isLocciEnabled, LOCCI_PROVIDER_ID } from '$lib/server/locci';

/**
 * Auth mutations are `form` (not `query`) on purpose: remote functions may only
 * write cookies from `form` and `command`, and the whole point here is the
 * session cookie that `sveltekitCookies()` sets.
 *
 * Note the `_password` field names — SvelteKit strips leading-underscore fields
 * when repopulating a form after a failed non-JS submission, so the password is
 * never echoed back to the browser.
 */

const email = v.pipe(
	v.string(),
	v.trim(),
	v.nonEmpty('Enter your email address.'),
	v.email('That does not look like an email address.')
);

const password = v.pipe(
	v.string(),
	v.nonEmpty('Enter your password.'),
	v.minLength(8, 'Passwords must be at least 8 characters.')
);

/** Where users land once they have a session. */
const AFTER_SIGN_IN = '/dashboard';

/** Current user, or null. Safe to call from anywhere — reads only. */
export const getSession = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) return null;
	const { id, name, email, image, emailVerified } = locals.user;
	return { id, name, email, image, emailVerified };
});

/**
 * Better Auth reports every failure as an `APIError`. Surface its message
 * against the form as a whole rather than guessing which field is at fault —
 * "invalid email or password" deliberately does not say which one.
 */
function fail(err: unknown, fallback: string): never {
	if (err instanceof APIError) {
		invalid(err.body?.message ?? err.message ?? fallback);
	}
	throw err;
}

export const signIn = form(
	v.object({ email, _password: password }),
	async ({ email, _password }) => {
		const auth = requireAuth();
		try {
			await auth.api.signInEmail({ body: { email, password: _password } });
		} catch (err) {
			fail(err, 'Could not sign you in.');
		}
		redirect(303, AFTER_SIGN_IN);
	}
);

export const signUp = form(
	v.object({
		name: v.pipe(v.string(), v.trim(), v.nonEmpty('Enter your name.')),
		email,
		_password: password
	}),
	async ({ name, email, _password }) => {
		const auth = requireAuth();
		try {
			await auth.api.signUpEmail({ body: { name, email, password: _password } });
		} catch (err) {
			fail(err, 'Could not create your account.');
		}
		redirect(303, AFTER_SIGN_IN);
	}
);

export const signOut = form(async () => {
	const auth = requireAuth();
	const { request } = getRequestEvent();
	await auth.api.signOut({ headers: request.headers });
	redirect(303, '/login');
});

/**
 * Kicks off the OpenAuth authorization-code flow. Better Auth writes the PKCE
 * verifier and state to cookies here — which is exactly why this has to be a
 * `form` rather than a `query`.
 */
export const signInWithLocci = form(async () => {
	const auth = requireAuth();

	if (!isLocciEnabled(env)) {
		invalid('Sign in with Locci is not configured on this deployment.');
	}

	let url: string;
	try {
		const result = await auth.api.signInWithOAuth2({
			body: { providerId: LOCCI_PROVIDER_ID, callbackURL: AFTER_SIGN_IN }
		});
		url = result.url;
	} catch (err) {
		fail(err, 'Could not reach Locci.');
	}

	redirect(303, url);
});
