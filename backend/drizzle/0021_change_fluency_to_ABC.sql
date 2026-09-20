ALTER TABLE `tahfidz_deposits` MODIFY COLUMN `fluency` enum('lancar','kurang_lancar','mengulang','A','B','C');--> statement-breakpoint
UPDATE `tahfidz_deposits` SET `fluency` = 'A' WHERE `fluency` = 'lancar';--> statement-breakpoint
UPDATE `tahfidz_deposits` SET `fluency` = 'B' WHERE `fluency` = 'kurang_lancar';--> statement-breakpoint
UPDATE `tahfidz_deposits` SET `fluency` = 'C' WHERE `fluency` = 'mengulang';--> statement-breakpoint
ALTER TABLE `tahfidz_deposits` MODIFY COLUMN `fluency` enum('A','B','C');
