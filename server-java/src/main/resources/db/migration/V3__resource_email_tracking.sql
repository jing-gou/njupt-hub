-- Reconcile older production schemas that predate the email-tracking columns.
-- V1 already contains these columns for fresh databases, so both statements are
-- idempotent and become no-ops there.
SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'Resource'
        AND column_name = 'thankYouEmailSentAt'
    ),
    'SELECT 1',
    'ALTER TABLE `Resource` ADD COLUMN `thankYouEmailSentAt` DATETIME(3) NULL'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'Resource'
        AND column_name = 'reviewResultEmailSentAt'
    ),
    'SELECT 1',
    'ALTER TABLE `Resource` ADD COLUMN `reviewResultEmailSentAt` DATETIME(3) NULL'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'Resource'
        AND column_name = 'reviewResultEmailStatus'
    ),
    'SELECT 1',
    'ALTER TABLE `Resource` ADD COLUMN `reviewResultEmailStatus` ENUM(''PENDING'', ''APPROVED'', ''REJECTED'') NULL'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
