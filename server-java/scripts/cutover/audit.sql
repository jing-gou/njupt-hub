-- Read-only preflight checks for the Node -> Java cutover.
-- Output format: metric<TAB>value
SELECT 'rows.User' AS metric, COUNT(*) AS value FROM `User`;
SELECT 'rows.Resource' AS metric, COUNT(*) AS value FROM `Resource`;
SELECT 'rows.Review' AS metric, COUNT(*) AS value FROM `Review`;
SELECT 'rows.Like' AS metric, COUNT(*) AS value FROM `Like`;
SELECT 'rows.Reply' AS metric, COUNT(*) AS value FROM `Reply`;
SELECT 'rows.Report' AS metric, COUNT(*) AS value FROM `Report`;
SELECT 'rows.ReviewableItem' AS metric, COUNT(*) AS value FROM `ReviewableItem`;

SELECT 'orphan.Resource.uploaderId' AS metric, COUNT(*) AS value
FROM `Resource` r LEFT JOIN `User` u ON u.id = r.uploaderId WHERE u.id IS NULL;

SELECT 'orphan.Review.itemId' AS metric, COUNT(*) AS value
FROM `Review` r LEFT JOIN `ReviewableItem` i ON i.id = r.itemId WHERE i.id IS NULL;

SELECT 'orphan.Review.reviewerId' AS metric, COUNT(*) AS value
FROM `Review` r LEFT JOIN `User` u ON u.id = r.reviewerId WHERE u.id IS NULL;

SELECT 'orphan.Like.reviewId' AS metric, COUNT(*) AS value
FROM `Like` r LEFT JOIN `Review` v ON v.id = r.reviewId WHERE v.id IS NULL;

SELECT 'orphan.Like.userId' AS metric, COUNT(*) AS value
FROM `Like` r LEFT JOIN `User` u ON u.id = r.userId WHERE u.id IS NULL;

SELECT 'orphan.Reply.reviewId' AS metric, COUNT(*) AS value
FROM `Reply` r LEFT JOIN `Review` v ON v.id = r.reviewId WHERE v.id IS NULL;

SELECT 'orphan.Reply.userId' AS metric, COUNT(*) AS value
FROM `Reply` r LEFT JOIN `User` u ON u.id = r.userId WHERE u.id IS NULL;

SELECT 'orphan.Report.reviewId' AS metric, COUNT(*) AS value
FROM `Report` r LEFT JOIN `Review` v ON v.id = r.reviewId WHERE v.id IS NULL;

SELECT 'orphan.Report.userId' AS metric, COUNT(*) AS value
FROM `Report` r LEFT JOIN `User` u ON u.id = r.userId WHERE u.id IS NULL;

SELECT 'bad_password_hash' AS metric, COUNT(*) AS value
FROM `User`
WHERE username <> '游客'
  AND password NOT LIKE '$2a$%'
  AND password NOT LIKE '$2b$%'
  AND password NOT LIKE '$2y$%';

SELECT 'file_url.local_uploads' AS metric, COUNT(*) AS value
FROM `Resource` WHERE fileUrl LIKE '/uploads/%';

SELECT 'file_url.non_http' AS metric, COUNT(*) AS value
FROM `Resource` WHERE fileUrl NOT LIKE 'http%';

SELECT 'file_url.legacy_domain' AS metric, COUNT(*) AS value
FROM `Resource` WHERE fileUrl LIKE '%kodo.sugarfun.xyz%';

SELECT 'file_key.local_uploads' AS metric, COUNT(*) AS value
FROM `Resource` WHERE fileKey LIKE '/uploads/%' OR fileKey LIKE 'uploads/%';

SELECT 'file_url.avatar_local' AS metric, COUNT(*) AS value
FROM `User` WHERE avatarKey LIKE '/uploads/%' OR avatarKey LIKE 'uploads/%';

SELECT 'file_url.review_image_local' AS metric, COUNT(*) AS value
FROM `Review` WHERE imageUrl LIKE '/uploads/%' OR imageUrl LIKE 'uploads/%';

SELECT 'file_url.item_image_local' AS metric, COUNT(*) AS value
FROM `ReviewableItem` WHERE imageUrl LIKE '/uploads/%' OR imageUrl LIKE 'uploads/%';

SELECT 'time.min_createdAt' AS metric, MIN(createdAt) AS value FROM `Resource`;
SELECT 'time.max_createdAt' AS metric, MAX(createdAt) AS value FROM `Resource`;
