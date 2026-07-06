USE gopher_slayer;

-- Hero (single hero, id=1)
INSERT INTO heroes (name, hp, max_hp, attack, level, experience)
VALUES ('Gopher', 100, 100, 15, 1, 0);

-- Stages
INSERT INTO stages (name, description, required_experience, order_num) VALUES
('Forest',         'A quiet forest, but beware of slimes!',          0,   1),
('Cave',           'Dark caves filled with bats and rock monsters.',  40,  2),
('Castle',         'An abandoned castle haunted by the undead.',      100, 3),
('Hell Gate',      'The entrance to the underworld. Beware!',        180, 4),
('Dragon''s Lair', 'Face the legendary dragon and save the world!',  300, 5);

-- Enemies (1 per stage)
-- XP rewards are tuned to match stage unlock thresholds:
--   Stage 2 requires 40 XP  → Stage 1 reward = 40
--   Stage 3 requires 100 XP → Stage 2 reward = 60 (cumulative 100)
--   Stage 4 requires 180 XP → Stage 3 reward = 80 (cumulative 180)
--   Stage 5 requires 300 XP → Stage 4 reward = 120 (cumulative 300)
INSERT INTO enemies (stage_id, name, hp, max_hp, attack, experience_reward) VALUES
(1, 'Goblin',      40,  40,  8,  40),
(2, 'Rock Monster', 70,  70,  12, 60),
(3, 'Dark Knight', 100, 100, 18, 80),
-- NOTE: Stage 4 enemy is used in the Lv4 workshop task (battle_service.go bug).
(4, 'Demon',       150, 150, 22, 120),
-- NOTE: Stage 5 boss has attack=50, intentionally high for the Lv3 workshop task.
-- Students must create PUT /api/hero/hp to edit HP before this fight.
(5, 'Boss Dragon', 300, 300, 50, 200);
