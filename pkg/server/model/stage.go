package model

import "database/sql"

type Stage struct {
	ID                 int    `json:"id"`
	Name               string `json:"name"`
	Description        string `json:"description"`
	RequiredExperience int    `json:"required_experience"`
	OrderNum           int    `json:"order_num"`
	// IsUnlocked はDBに保存しない。ハンドラー側でヒーローの経験値と比較して設定する。
	IsUnlocked bool `json:"is_unlocked"`
}

type ClearStageResponse struct {
	Message          string `json:"message"`
	ExperienceGained int    `json:"experience_gained"`
	NewExperience    int    `json:"new_experience"`
}

// GetAllStages は order_num 順にすべてのステージを返す。
func GetAllStages(db *sql.DB) ([]*Stage, error) {
	rows, err := db.Query(`
		SELECT id, name, description, required_experience, order_num
		FROM stages ORDER BY order_num ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stages []*Stage
	for rows.Next() {
		s := &Stage{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum); err != nil {
			return nil, err
		}
		stages = append(stages, s)
	}
	return stages, rows.Err()
}

// GetStageByID は指定IDのステージを取得する。
func GetStageByID(db *sql.DB, id int) (*Stage, error) {
	s := &Stage{}
	row := db.QueryRow(`
		SELECT id, name, description, required_experience, order_num
		FROM stages WHERE id = ?
	`, id)
	err := row.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum)
	if err != nil {
		return nil, err
	}
	return s, nil
}

// GetTotalExpForStage はステージの全敵の経験値合計を返す。
func GetTotalExpForStage(db *sql.DB, stageID int) (int, error) {
	var total int
	row := db.QueryRow(`
		SELECT COALESCE(SUM(experience_reward), 0) FROM enemies WHERE stage_id = ?
	`, stageID)
	if err := row.Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}
