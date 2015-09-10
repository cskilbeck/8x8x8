DROP DATABASE IF EXISTS `G8`;
CREATE DATABASE `G8`;
USE `G8`;

CREATE TABLE `users`(
    user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    user_password VARCHAR(100) NOT NULL,
    user_created DATETIME);

CREATE TABLE `games`(
    game_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_timestamp DATETIME NOT NULL,
    game_parent INT,
    game_source LONGBLOB,
    game_title VARCHAR(32));

INSERT INTO `users`(
        user_email,
        user_password,
        user_created)
    VALUES(
        'chs@chs.chs',
        'password',
        NOW());

SELECT * FROM `users`;