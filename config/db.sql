CREATE DATABASE IF NOT EXISTS `user_db`;
USE `user_db`;
CREATE TABLE `users`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('user','admin') NOT NULL,
    `messages` INT
);
INSERT INTO `users`(`username`,`password`,`role`) VALUES('admin','$2a$10$Y81FQMc4SJqo46ac/wVyk.gZfoCwLuR6/fvUkPS/9N.AXTvC2FhVm','admin');

CREATE TABLE `books`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `author` VARCHAR(255) NOT NULL,
    `genre` VARCHAR(255) NOT NULL,
    `status` ENUM('available','Unavailable') NOT NULL,
    `quantity` INT
);

CREATE TABLE `requests`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL,
    `book_id` INT,
    FOREIGN KEY(`book_id`) REFERENCES books(id),
    `title` VARCHAR(255) NULL,
    `request` ENUM('checkout','checkin','adminPrivs') NOT NULL,
    `status` ENUM('pending','approved','disapproved') NOT NULL,
    `user_status` ENUM('seen','unseen','pending') NOT NULL,
    `date` DATE NOT NULL
);



CREATE TABLE `borrowing_history`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `book_id` INT,
     FOREIGN KEY (`book_id`) REFERENCES books(id),
    `title` VARCHAR(255) NOT NULL,
    `borrower` VARCHAR(255) NOT NULL,
    `borrowed_date` DATE NOT NULL,
    `returned_date` DATE
);
