CREATE TABLE `readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` integer NOT NULL,
	`station_id` integer NOT NULL,
	`pollutant_id` text NOT NULL,
	`min_value` real,
	`max_value` real,
	`avg_value` real,
	`source_last_update` text,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_readings_snap` ON `readings` (`snapshot_id`,`station_id`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fetched_at` text NOT NULL,
	`source_count` integer,
	`status` text NOT NULL,
	`content_hash` text
);
--> statement-breakpoint
CREATE TABLE `station_aqi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` integer NOT NULL,
	`station_id` integer NOT NULL,
	`aqi` integer,
	`category` text,
	`dominant_pollutant` text,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_aqi_time` ON `station_aqi` (`snapshot_id`,`station_id`,`aqi`);--> statement-breakpoint
CREATE INDEX `idx_aqi_station` ON `station_aqi` (`station_id`,`snapshot_id`,`aqi`);--> statement-breakpoint
CREATE TABLE `stations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`latitude` real,
	`longitude` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_station` ON `stations` (`name`,`city`,`state`);