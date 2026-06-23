CREATE TABLE `answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`chapter` text NOT NULL,
	`question_index` integer NOT NULL,
	`selected` text NOT NULL,
	`correct` text NOT NULL,
	`is_correct` integer NOT NULL,
	`answered_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `answers_user_chapter_idx` ON `answers` (`user_id`,`chapter`);--> statement-breakpoint
CREATE INDEX `answers_user_answered_at_idx` ON `answers` (`user_id`,`answered_at`);--> statement-breakpoint
CREATE INDEX `answers_question_idx` ON `answers` (`chapter`,`question_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `answers_unique_idx` ON `answers` (`user_id`,`chapter`,`question_index`);--> statement-breakpoint
CREATE TABLE `question_tags` (
	`chapter` text NOT NULL,
	`question_index` integer NOT NULL,
	`tag` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_tags_pk` ON `question_tags` (`chapter`,`question_index`,`tag`);--> statement-breakpoint
CREATE INDEX `question_tags_tag_idx` ON `question_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_student_id_unique` ON `users` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_student_id_idx` ON `users` (`student_id`);