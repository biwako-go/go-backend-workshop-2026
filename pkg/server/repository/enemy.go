package repository

import (
	"database/sql"

	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type EnemyRepository struct {
	db *sql.DB
}

func NewEnemyRepository(db *sql.DB) *EnemyRepository {
	return &EnemyRepository{db: db}
}

// GetByStageID は指定ステージの敵一覧を返す。
func (r *EnemyRepository) GetByStageID(stageID int) ([]*service.Enemy, error) {
	rows, err := r.db.Query(`
		SELECT id, stage_id, name, hp, max_hp, attack, experience_reward
		FROM enemies WHERE stage_id = ? ORDER BY id ASC
	`, stageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var enemies []*service.Enemy
	for rows.Next() {
		e := &service.Enemy{}
		if err := rows.Scan(&e.ID, &e.StageID, &e.Name, &e.HP, &e.MaxHP, &e.Attack, &e.ExperienceReward); err != nil {
			return nil, err
		}
		enemies = append(enemies, e)
	}
	return enemies, rows.Err()
}

// PeekVault は宝物庫に敵（ミミック）が潜んでいないか、先頭の1件だけ覗いて確かめる。
//
// [Lv15 バグ仕込み箇所]
// rows は使い終わったら Close しないと、その分のDB接続が開きっぱなしになる
// （宝物庫の扉の閉め忘れ）。今回は先頭の1件で切り上げて return しているため、
// 最後まで読み切られず自動クローズもされない。
// Query の直後に defer rows.Close() を入れるのが Go の作法。
func (r *EnemyRepository) PeekVault() (bool, error) {
	rows, err := r.db.Query(`SELECT id FROM enemies`)
	if err != nil {
		return false, err
	}
	if rows.Next() {
		return true, nil // ← 扉（rows）を開けっぱなしのまま帰っている
	}
	return false, rows.Err()
}

// OpenConnections は現在開いているDB接続数を返す（Lv15の判定用。変更しない）。
func (r *EnemyRepository) OpenConnections() int {
	return r.db.Stats().OpenConnections
}

// GetChallenges はチャレンジ（Lv6〜Lv28）の敵一覧を解放EXP順に返す。
func (r *EnemyRepository) GetChallenges() ([]*service.ChallengeEnemy, error) {
	rows, err := r.db.Query(`
		SELECT id, action, name, hp, max_hp, attack, unlock_exp
		FROM challenge_enemies ORDER BY unlock_exp ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var enemies []*service.ChallengeEnemy
	for rows.Next() {
		e := &service.ChallengeEnemy{}
		if err := rows.Scan(&e.ID, &e.Action, &e.Name, &e.HP, &e.MaxHP, &e.Attack, &e.UnlockExp); err != nil {
			return nil, err
		}
		enemies = append(enemies, e)
	}
	return enemies, rows.Err()
}
