-- Batch 4: transactional mail outbox
CREATE TABLE `mail_outbox` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `dedupe_key` VARCHAR(191) NOT NULL,
  `mail_type` VARCHAR(50) NOT NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body_text` MEDIUMTEXT NULL,
  `body_html` MEDIUMTEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `attempts` INT NOT NULL DEFAULT 0,
  `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sent_at` DATETIME(3) NULL,
  `last_error` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `mail_outbox_dedupe_key` (`dedupe_key`),
  KEY `mail_outbox_due_idx` (`status`, `next_attempt_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
