import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null };
	const { id, name, email, image } = locals.user;
	return { user: { id, name, email, image } };
};
