ALTER TABLE `Resource`
ADD COLUMN `reviewResultEmailSentAt` DATETIME(3) NULL,
ADD COLUMN `reviewResultEmailStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NULL;
