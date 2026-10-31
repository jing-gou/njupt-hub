INSERT INTO `Resource`
(`id`, `title`, `description`, `fileUrl`, `course`, `downloadCount`, `createdAt`,
 `uploaderId`, `status`, `updatedAt`, `category`, `fileKey`, `fileName`, `fileSize`, `mimeType`)
VALUES
(2001, '高等数学期末复习提纲', '覆盖极限、导数、积分', 'https://kodo.test/public/math/outline.pdf',
 '高等数学', 10, DATE_ADD(NOW(3), INTERVAL 1 SECOND), 1001, 'APPROVED', NOW(3),
 '复习资料', 'public/math/outline.pdf', 'outline.pdf', 1024, 'application/pdf'),
(2002, '线性代数作业参考答案', '第一到第三章', 'https://kodo.test/pending/math/linear.pdf',
 '线性代数', 0, DATE_ADD(NOW(3), INTERVAL 2 SECOND), 1002, 'PENDING', NOW(3),
 '作业', 'pending/math/linear.pdf', 'linear.pdf', 2048, 'application/pdf'),
(2003, '被拒绝的资料', '测试拒绝状态', 'https://kodo.test/pending/math/rejected.pdf',
 '高等数学', 0, DATE_ADD(NOW(3), INTERVAL 3 SECOND), 1001, 'REJECTED', NOW(3),
 '其他', NULL, 'rejected.pdf', 512, 'application/pdf'),
(2004, '游客上传的资料', '游客上传', 'https://kodo.test/pending/math/guest.pdf',
 '大学物理', 0, DATE_ADD(NOW(3), INTERVAL 4 SECOND), 1004, 'PENDING', NOW(3),
 '其他', 'pending/math/guest.pdf', 'guest.pdf', 4096, 'application/pdf'),
(2005, '高等数学试卷', '往年试卷', 'https://kodo.test/public/math/exam.pdf',
 '高等数学', 30, DATE_ADD(NOW(3), INTERVAL 5 SECOND), 1002, 'APPROVED', NOW(3),
 '试卷', 'public/math/exam.pdf', 'exam.pdf', 8192, 'application/pdf');
