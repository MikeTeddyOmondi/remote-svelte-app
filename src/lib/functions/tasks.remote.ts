import * as v from 'valibot';
import { and, desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { form, query, getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { task } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/auth-guard';

/**
 * Every function here calls `requireUser()` itself. These are standalone HTTP
 * endpoints — the `(app)` layout guard does not cover them.
 */

function db() {
	const { platform } = getRequestEvent();
	const d1 = platform?.env?.DB;
	if (!d1) error(500, 'Database unavailable');
	return getDb(d1);
}

export const getTasks = query(async () => {
	const user = requireUser();
	return db()
		.select({
			id: task.id,
			title: task.title,
			done: task.done,
			priority: task.priority,
			createdAt: task.createdAt
		})
		.from(task)
		.where(eq(task.userId, user.id))
		.orderBy(task.done, desc(task.createdAt));
});

export const createTask = form(
	v.object({
		title: v.pipe(
			v.string(),
			v.trim(),
			v.nonEmpty('Give the task a title.'),
			v.maxLength(200, 'Keep the title under 200 characters.')
		)
	}),
	async ({ title }) => {
		const user = requireUser();
		await db().insert(task).values({ userId: user.id, title });

		// Single-flight: refresh on the server so the updated list rides back with
		// this response instead of costing a second round trip.
		await getTasks().refresh();
	}
);

export const toggleTask = form(
	v.object({ id: v.string(), done: v.optional(v.boolean(), false) }),
	async ({ id, done }) => {
		const user = requireUser();
		// Scoping the UPDATE by userId is the ownership check — without it any
		// signed-in user could toggle any row by guessing an id.
		await db()
			.update(task)
			.set({ done: !done })
			.where(and(eq(task.id, id), eq(task.userId, user.id)));

		await getTasks().refresh();
	}
);

export const deleteTask = form(v.object({ id: v.string() }), async ({ id }) => {
	const user = requireUser();
	await db()
		.delete(task)
		.where(and(eq(task.id, id), eq(task.userId, user.id)));

	await getTasks().refresh();
});
