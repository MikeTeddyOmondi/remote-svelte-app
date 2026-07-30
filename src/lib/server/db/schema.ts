import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export const task = sqliteTable(
	'task',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		done: integer('done', { mode: 'boolean' }).notNull().default(false),
		priority: integer('priority').notNull().default(1),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('task_user_id_idx').on(t.userId)]
);

export * from './auth.schema';
