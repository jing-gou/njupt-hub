-- AlterTable
ALTER TABLE `Review` ADD COLUMN `ip` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReviewableItem` ADD COLUMN `college` VARCHAR(191) NULL,
    ADD COLUMN `location` VARCHAR(191) NULL;
