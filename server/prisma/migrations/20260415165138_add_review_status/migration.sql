-- AlterTable
ALTER TABLE `Review` ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX `Review_status_idx` ON `Review`(`status`);
