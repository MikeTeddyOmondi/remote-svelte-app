-- SQLite cannot `ADD COLUMN ... NOT NULL` without a default, even on an empty
-- table, so the `task` table is recreated rather than altered. This is safe:
-- `task` was never written to (no routes existed for it) and holds no data.
DROP TABLE IF EXISTS `task`;--> statement-breakpoint
CREATE TABLE `task` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `task_user_id_idx` ON `task` (`user_id`);
