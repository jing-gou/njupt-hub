INSERT INTO `ReviewableItem`
(`id`, `title`, `description`, `imageUrl`, `type`, `location`, `college`, `avgRating`, `createdAt`, `updatedAt`)
VALUES
(3001, '张老师', '高数辅导', 'assets/items/mentor.png', 'MENTOR', '教三楼', '理学院', 4.5, NOW(3), NOW(3)),
(3002, '第一食堂', '一楼窗口', NULL, 'CANTEEN', '一食堂', NULL, 3.0, NOW(3), NOW(3)),
(3003, '老王外卖', '夜宵', NULL, 'TAKEOUT', '校外', NULL, 4.0, NOW(3), NOW(3)),
(3004, '李老师', '英语辅导', NULL, 'MENTOR', '教一楼', '外国语学院', 0, NOW(3), NOW(3));

INSERT INTO `Review`
(`id`, `rating`, `comment`, `ip`, `createdAt`, `reviewerId`, `updatedAt`, `imageUrl`, `status`, `itemId`)
VALUES
(4001, 5, '讲得很清楚', '127.0.0.1', DATE_SUB(NOW(3), INTERVAL 1 HOUR), 1001, NOW(3), NULL, 'APPROVED', 3001),
(4002, 4, ' pending review', '127.0.0.1', DATE_SUB(NOW(3), INTERVAL 2 HOUR), 1002, NOW(3), NULL, 'PENDING', 3001),
(4003, 3, '一般', '127.0.0.1', DATE_SUB(NOW(3), INTERVAL 3 HOUR), 1001, NOW(3), NULL, 'APPROVED', 3002),
(4004, 4, '被拒绝', '127.0.0.1', DATE_SUB(NOW(3), INTERVAL 4 HOUR), 1002, NOW(3), NULL, 'REJECTED', 3003),
(4005, 1, NULL, '127.0.0.1', DATE_SUB(NOW(3), INTERVAL 5 HOUR), 1004, NOW(3), NULL, 'APPROVED', 3001);

INSERT INTO `Like` (`id`, `userId`, `reviewId`, `createdAt`) VALUES
(5001, 1002, 4001, NOW(3)),
(5002, 1003, 4001, NOW(3));

INSERT INTO `Reply` (`id`, `content`, `userId`, `reviewId`, `createdAt`) VALUES
(6001, '同意', 1002, 4001, NOW(3));

INSERT INTO `Report` (`id`, `reason`, `userId`, `reviewId`, `createdAt`) VALUES
(7001, '内容不实', 1003, 4001, NOW(3));
