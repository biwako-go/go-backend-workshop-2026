package model

import "database/sql"

type Enemy struct {
	ID               int    `json:"id"`
	StageID          int    `json:"stage_id"`
	Name             string `json:"name"`
	HP               int    `json:"hp"`
	MaxHP            int    `json:"max_hp"`
	Attack           int    `json:"attack"`
	ExperienceReward int    `json:"experience_reward"`
}

// GetEnemiesByStageID は指定ステージの敵一覧を返す。
func GetEnemiesByStageID(db *sql.DB, stageID int) ([]*Enemy, error) {
	rows, err := db.Query(`
		SELECT id, stage_id, name, hp, max_hp, attack, experience_reward
		FROM enemies WHERE stage_id = ? ORDER BY id ASC
	`, stageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var enemies []*Enemy
	for rows.Next() {
		e := &Enemy{}
		if err := rows.Scan(&e.ID, &e.StageID, &e.Name, &e.HP, &e.MaxHP, &e.Attack, &e.ExperienceReward); err != nil {
			return nil, err
		}
		enemies = append(enemies, e)
	}
	return enemies, rows.Err()
}
