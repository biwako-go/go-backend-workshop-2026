-- 初期化スクリプトを流すクライアントの文字コードを utf8mb4 に固定する
-- （これがないと日本語データが文字化けして保存される）
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS gopher_slayer DEFAULT CHARACTER SET utf8mb4;
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

-- チャレンジ（Lv6〜Lv28）で対決する敵
-- action はフロントのチャレンジ種別と対応するキー
CREATE TABLE IF NOT EXISTS challenge_enemies (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    action     VARCHAR(30)  NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL,
    hp         INT NOT NULL,
    max_hp     INT NOT NULL,
    attack     INT NOT NULL,
    unlock_exp INT NOT NULL
);
