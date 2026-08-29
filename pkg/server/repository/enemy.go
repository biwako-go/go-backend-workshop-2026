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
