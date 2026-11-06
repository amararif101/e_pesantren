ALTER TABLE `student_leaves` ADD `leave_number` varchar(80);--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `qr_token` varchar(100);--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `leave_category` varchar(50) DEFAULT 'pulang';--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `start_time` varchar(10) DEFAULT '08:00';--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `end_time` varchar(10) DEFAULT '17:00';--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `destination` varchar(255);--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `pickup_name` varchar(150);--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `pickup_relation` varchar(100);--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `pickup_phone` varchar(50);--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `requested_by_role` varchar(30) DEFAULT 'staff';--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `status` varchar(30) NOT NULL DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `approved_by` int;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `approved_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `checked_out_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `checked_out_by` int;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `checked_in_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `checked_in_by` int;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `late_minutes` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `late_handling` varchar(30);--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `late_notes` text;--> statement-breakpoint
ALTER TABLE `student_leaves` ADD `punishment_id` int;
