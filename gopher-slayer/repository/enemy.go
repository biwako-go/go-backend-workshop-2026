package repository

import (
	"database/sql"

	"github.com/maropook/gopher-slayer-layered/entity"
)

type EnemyRepository struct {
	db *sql.DB
}

func NewEnemyRepository(db *sql.DB) *EnemyRepository {
	return &EnemyRepository{db: db}
}

func (r *EnemyRepository) GetByStageID(stageID int) ([]*entity.Enemy, error) {
	rows, err := r.db.Query(`
		SELECT id, stage_id, name, hp, max_hp, attack, experience_reward
		FROM enemies WHERE stage_id = ? ORDER BY id ASC
	`, stageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var enemies []*entity.Enemy
	for rows.Next() {
		e := &entity.Enemy{}
		if err := rows.Scan(&e.ID, &e.StageID, &e.Name, &e.HP, &e.MaxHP, &e.Attack, &e.ExperienceReward); err != nil {
			return nil, err
		}
		enemies = append(enemies, e)
	}
	return enemies, rows.Err()
}

func (r *EnemyRepository) GetTotalExpForStage(stageID int) (int, error) {
	var total int
	row := r.db.QueryRow(`
		SELECT COALESCE(SUM(experience_reward), 0) FROM enemies WHERE stage_id = ?
	`, stageID)
	if err := row.Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}
