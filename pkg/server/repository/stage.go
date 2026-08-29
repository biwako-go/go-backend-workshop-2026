package repository

import (
	"database/sql"

	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type StageRepository struct {
	db *sql.DB
}

func NewStageRepository(db *sql.DB) *StageRepository {
	return &StageRepository{db: db}
}

// GetAll は order_num 順にすべてのステージを返す。
func (r *StageRepository) GetAll() ([]*service.Stage, error) {
	rows, err := r.db.Query(`
		SELECT id, name, description, required_experience, order_num
		FROM stages ORDER BY order_num ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stages []*service.Stage
	for rows.Next() {
		s := &service.Stage{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum); err != nil {
			return nil, err
		}
		stages = append(stages, s)
	}
	return stages, rows.Err()
}

// GetByID は指定IDのステージを取得する。
//
// [Lv10 バグ仕込み箇所]
// エラーを握りつぶして nil を返しているため、存在しないステージIDを渡すと
// 呼び出し側が nil ポインタを参照して panic する。
// エラーをそのまま返すのが正解（sql.ErrNoRows が「見つからない」を表す）。
func (r *StageRepository) GetByID(id int) (*service.Stage, error) {
	s := &service.Stage{}
	row := r.db.QueryRow(`
		SELECT id, name, description, required_experience, order_num
		FROM stages WHERE id = ?
	`, id)
	err := row.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum)
	if err != nil {
		return nil, nil // ← エラーを握りつぶしている
	}
	return s, nil
}

// GetTotalExp はステージの全敵の経験値合計を返す。
func (r *StageRepository) GetTotalExp(stageID int) (int, error) {
	var total int
	row := r.db.QueryRow(`
		SELECT COALESCE(SUM(experience_reward), 0) FROM enemies WHERE stage_id = ?
	`, stageID)
	if err := row.Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}
