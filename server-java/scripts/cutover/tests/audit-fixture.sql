DROP DATABASE IF EXISTS audit_fixture;
CREATE DATABASE audit_fixture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE audit_fixture;

CREATE TABLE `User` (
  id INT PRIMARY KEY,
  username VARCHAR(191) NOT NULL,
  password VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL
);
CREATE TABLE `Resource` (
  id INT PRIMARY KEY,
  title VARCHAR(191) NOT NULL,
  fileUrl VARCHAR(191) NOT NULL,
  uploaderId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL
);
CREATE TABLE `ReviewableItem` (
  id INT PRIMARY KEY,
  title VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL
);
CREATE TABLE `Review` (
  id INT PRIMARY KEY,
  itemId INT NOT NULL,
  reviewerId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL
);
CREATE TABLE `Like` (
  id INT PRIMARY KEY,
  reviewId INT NOT NULL,
  userId INT NOT NULL
);
CREATE TABLE `Reply` (
  id INT PRIMARY KEY,
  reviewId INT NOT NULL,
  userId INT NOT NULL
);
CREATE TABLE `Report` (
  id INT PRIMARY KEY,
  reviewId INT NOT NULL,
  userId INT NOT NULL
);

INSERT INTO `User` VALUES
  (1, 'alice', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', '2026-01-01 00:00:00.000');
INSERT INTO `Resource` VALUES
  (1, 'orphan', '/uploads/a.pdf', 999, '2026-01-02 00:00:00.000'),
  (2, 'ok', 'https://cdn.example/a.pdf', 1, '2026-01-03 00:00:00.000');
INSERT INTO `ReviewableItem` VALUES (1, 'item', '2026-01-01 00:00:00.000');
INSERT INTO `Review` VALUES (1, 1, 1, '2026-01-04 00:00:00.000');
INSERT INTO `Like` VALUES (1, 1, 1);
INSERT INTO `Reply` VALUES (1, 1, 1);
INSERT INTO `Report` VALUES (1, 1, 1);
