/*
  Warnings:

  - You are about to drop the column `project` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `Review` table. All the data in the column will be lost.
  - You are about to alter the column `rating` on the `Review` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - Added the required column `itemId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Resource` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `fileKey` VARCHAR(191) NULL,
    ADD COLUMN `fileName` VARCHAR(191) NULL,
    ADD COLUMN `fileSize` INTEGER NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Review` DROP COLUMN `project`,
    DROP COLUMN `title`,
    DROP COLUMN `version`,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `itemId` INTEGER NOT NULL,
    MODIFY `rating` DOUBLE NOT NULL;

-- CreateTable
CREATE TABLE `ReviewableItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `type` ENUM('MENTOR', 'CANTEEN', 'TAKEOUT') NOT NULL,
    `avgRating` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Resource_category_idx` ON `Resource`(`category`);

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ReviewableItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
