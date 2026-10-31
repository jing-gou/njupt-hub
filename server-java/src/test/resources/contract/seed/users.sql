-- Test users share the password: Password123
-- bcrypt hash generated with bcryptjs cost 10, compatible with Spring BCryptPasswordEncoder.
INSERT INTO `User` (`id`, `username`, `password`, `email`, `role`, `experience`, `avatarKey`, `createdAt`)
VALUES
(1001, 'alice', '$2b$10$/hcB0XyFHCazGUb6jDY1QOYgEyxk8qRuBX1Mj8WU6D7U3cIt8sEmy', 'alice@example.com', 'USER', 120, 'assets/avatars/alice.png', NOW(3)),
(1002, 'bob', '$2b$10$/hcB0XyFHCazGUb6jDY1QOYgEyxk8qRuBX1Mj8WU6D7U3cIt8sEmy', 'bob@example.com', 'USER', 80, NULL, DATE_ADD(NOW(3), INTERVAL 1 SECOND)),
(1003, 'admin', '$2b$10$/hcB0XyFHCazGUb6jDY1QOYgEyxk8qRuBX1Mj8WU6D7U3cIt8sEmy', 'admin@example.com', 'ADMIN', 300, NULL, DATE_ADD(NOW(3), INTERVAL 2 SECOND)),
(1004, '游客', 'guest-no-password', 'guest@njupt.hub', 'USER', 50, NULL, DATE_ADD(NOW(3), INTERVAL 3 SECOND)),
(1005, 'charlie', '$2b$10$/hcB0XyFHCazGUb6jDY1QOYgEyxk8qRuBX1Mj8WU6D7U3cIt8sEmy', 'charlie@example.com', 'USER', 60, NULL, DATE_ADD(NOW(3), INTERVAL 4 SECOND));
