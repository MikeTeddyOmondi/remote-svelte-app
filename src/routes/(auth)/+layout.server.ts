import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isLocciEnabled } from '$lib/server/locci';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Already signed in? Nothing to do here.
	if (locals.user) redirect(303, '/dashboard');

	// Which providers to offer is deployment config, not per-request data, so it
	// travels with the page load. Fetching it via a remote `query` would leave
	// the button un-rendered until hydration, and invisible without JavaScript.
	return { locci: isLocciEnabled(env) };
};
