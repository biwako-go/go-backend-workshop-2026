USE gopher_slayer;

-- ヒーロー（id=1 の1件のみ）
INSERT INTO heroes (name, hp, max_hp, attack, level, experience)
VALUES ('Gopher', 100, 100, 15, 1, 0);

-- ステージ
INSERT INTO stages (name, description, required_experience, order_num) VALUES
('森',         'スライムが出没する静かな森。',                    0,   1),
('洞窟',       'コウモリと岩のモンスターが潜む暗い洞窟。',        40,  2),
('城',         'アンデッドが徘徊する廃城。',                      100, 3),
('地獄の門',   '地獄への入り口。覚悟して進め！',                  180, 4),
('ドラゴンの巣', '伝説のドラゴンと戦い、世界を救え！',            300, 5);

-- 敵（1ステージ1体）
-- 経験値はステージ解放条件に合わせて調整済み:
--   ステージ2: 40XP 必要 → ステージ1の報酬 = 40
--   ステージ3: 100XP 必要 → ステージ2の報酬 = 60（累計100）
--   ステージ4: 180XP 必要 → ステージ3の報酬 = 80（累計180）
--   ステージ5: 300XP 必要 → ステージ4の報酬 = 120（累計300）
INSERT INTO enemies (stage_id, name, hp, max_hp, attack, experience_reward) VALUES
(1, 'ゴブリン',         40,  40,  8,    40),
(2, 'ロックモンスター', 70,  70,  12,   60),
(3, 'ダークナイト',     100, 100, 2000, 80),
-- Lv4 のバグ仕込み対象（handler/battle.go の Attack で攻撃反転）
(4, 'デーモン',         150, 150, 22,   120),
-- Lv3 のタスク: ボスが強いため PUT /api/hero/hp で HP を上げる必要がある
(5, 'ボスドラゴン',     300, 300, 50,   200);
