import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Navigation guard only. This does NOT protect the remote functions these pages
 * call — those are separate endpoints and re-check auth themselves via
 * `requireUser()` in `$lib/server/auth-guard`.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const { id, name, email, image } = locals.user;
	return { user: { id, name, email, image } };
};
