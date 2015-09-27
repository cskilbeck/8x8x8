DROP DATABASE IF EXISTS `G8`;
CREATE DATABASE `G8`;
USE `G8`;

CREATE TABLE `users`(
    user_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    user_username VARCHAR(200) UNIQUE NOT NULL,
    user_password VARCHAR(100) NOT NULL,
    user_session INT UNSIGNED,
    user_options VARCHAR(8192),
    user_created DATETIME);

CREATE TABLE `games`(
    game_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    game_created DATETIME NOT NULL,
    game_lastsaved DATETIME NOT NULL,
    game_screenshot BINARY(128),
    game_title VARCHAR(32),
    game_instructions VARCHAR(240),
    game_framerate TINYINT UNSIGNED DEFAULT 0,
    game_rating FLOAT NOT NULL DEFAULT 0,
    game_source TEXT,
    UNIQUE KEY game_name (game_title, user_id));

CREATE TABLE `ratings`(
    rating_timestamp DATETIME NOT NULL,
    game_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    rating_stars TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (game_id, user_id));

INSERT INTO `users`(
        user_email,
        user_username,
        user_password,
        user_created)
    VALUES(
        'chs@chs.chs',
        'chs',
        'password',
        NOW());

INSERT INTO `games`(
        user_id,
        game_created,
        game_lastsaved,
        game_source,
        game_title,
        game_instructions)
    VALUES(
        1,
        NOW(),
        NOW(),
        'source!',
        'game1',
        'instructions!');

INSERT INTO `ratings`(
        rating_timestamp,
        game_id,
        user_id,
        rating_stars)
    VALUES(
        NOW(),
        1,
        1,
        5);

SELECT * FROM `users`;
SELECT * from `games`;

-- get average rating for a game: sum(rating_stars) / (count(ratings) * 5)
