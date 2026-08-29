CREATE DATABASE IF NOT EXISTS gopher_slayer;
USE gopher_slayer;

CREATE TABLE IF NOT EXISTS heroes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL DEFAULT 'Gopher',
    hp          INT          NOT NULL DEFAULT 100,
    max_hp      INT          NOT NULL DEFAULT 100,
    attack      INT          NOT NULL DEFAULT 15,
    level       INT          NOT NULL DEFAULT 1,
    experience  INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stages (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    required_experience INT NOT NULL DEFAULT 0,
    order_num           INT NOT NULL
);

CREATE TABLE IF NOT EXISTS enemies (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    stage_id          INT NOT NULL,
    name              VARCHAR(100) NOT NULL,
    hp                INT NOT NULL,
    max_hp            INT NOT NULL,
    attack            INT NOT NULL,
    experience_reward INT NOT NULL DEFAULT 0,
    FOREIGN KEY (stage_id) REFERENCES stages(id)
);
