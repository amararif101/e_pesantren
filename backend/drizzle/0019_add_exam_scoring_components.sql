ALTER TABLE `tahfidz_exam_types` MODIFY COLUMN `category` enum('UPK','UKJ','UA','Suluk','Jilsah','Sertifikasi','Other') NOT NULL DEFAULT 'Other';--> statement-breakpoint
ALTER TABLE `tahfidz_exams` MODIFY COLUMN `exam_category` enum('UPK','UKJ','UA','Suluk','Jilsah','Sertifikasi','Other') DEFAULT 'Other';--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `nilai1` int;--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `nilai2` int;--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `nilai3` int;--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `nilai4` int;--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `capaian_target_pages` int;--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `capaian_target_score` decimal(5,2);--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `khoto_jali_count` int;--> statement-breakpoint
ALTER TABLE `tahfidz_exams` ADD `khoto_khofi_count` int;