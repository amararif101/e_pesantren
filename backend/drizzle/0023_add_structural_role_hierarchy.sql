CREATE TABLE `structural_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(150) NOT NULL,
	`type` enum('institution','division','madrasah','department','unit') NOT NULL DEFAULT 'unit',
	`parent_id` int,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `structural_units_id` PRIMARY KEY(`id`),
	CONSTRAINT `structural_units_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `structural_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(150) NOT NULL,
	`scope` enum('pesantren','unit','madrasah','functional') NOT NULL DEFAULT 'unit',
	`rank_level` int NOT NULL DEFAULT 5,
	`default_unit_id` int,
	`can_backdate_tahfidz` boolean NOT NULL DEFAULT false,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `structural_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `structural_roles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `teacher_structural_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`structural_role_id` int NOT NULL,
	`structural_unit_id` int,
	`assignment_detail` varchar(255),
	`academic_year` varchar(20),
	`is_primary` boolean NOT NULL DEFAULT false,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`start_date` date,
	`end_date` date,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_structural_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_teacher_structural_role_unit` UNIQUE(`teacher_id`,`structural_role_id`,`structural_unit_id`)
);
--> statement-breakpoint
ALTER TABLE `structural_roles` ADD CONSTRAINT `structural_roles_default_unit_id_structural_units_id_fk` FOREIGN KEY (`default_unit_id`) REFERENCES `structural_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_structural_assignments` ADD CONSTRAINT `teacher_structural_assignments_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_structural_assignments` ADD CONSTRAINT `teacher_structural_assignments_structural_role_id_structural_roles_id_fk` FOREIGN KEY (`structural_role_id`) REFERENCES `structural_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_structural_assignments` ADD CONSTRAINT `teacher_structural_assignments_structural_unit_id_structural_units_id_fk` FOREIGN KEY (`structural_unit_id`) REFERENCES `structural_units`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `tahfidz_backdate_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`halaqah_id` int,
	`requested_date` varchar(10) NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewed_by_teacher_id` int,
	`reviewed_by_user_id` int,
	`review_notes` text,
	`reviewed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tahfidz_backdate_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tahfidz_backdate_requests` ADD CONSTRAINT `tahfidz_backdate_requests_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tahfidz_backdate_requests` ADD CONSTRAINT `tahfidz_backdate_requests_reviewed_by_teacher_id_teachers_id_fk` FOREIGN KEY (`reviewed_by_teacher_id`) REFERENCES `teachers`(`id`) ON DELETE set null ON UPDATE no action;
