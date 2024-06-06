CREATE DATABASE IF NOT EXISTS `users_db`;

CREATE TABLE `users`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(255) NOT NULL,
    `messages` INT
);

CREATE TABLE `books`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `author` VARCHAR(255) NOT NULL,
    `genre` VARCHAR(255) NOT NULL,
    `status` ENUM('available','Unavailable') NOT NULL,
    `quantity` INT NOT NULL
);

CREATE TABLE `requests`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL,
    `book_id` INT,
    FOREIGN KEY(`book_id`) REFERENCES books(id),
    `title` VARCHAR(255) NULL,
    `request` ENUM('pending','approved','disapproved') NOT NULL,
    `status` VARCHAR(255) NOT NULL,
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
