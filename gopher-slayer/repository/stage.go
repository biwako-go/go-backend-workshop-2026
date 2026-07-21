package repository

import (
	"database/sql"

	"github.com/maropook/gopher-slayer-layered/entity"
)

type StageRepository struct {
	db *sql.DB
}

func NewStageRepository(db *sql.DB) *StageRepository {
	return &StageRepository{db: db}
}

func (r *StageRepository) GetAll() ([]*entity.Stage, error) {
	rows, err := r.db.Query(`
		SELECT id, name, description, required_experience, order_num
		FROM stages ORDER BY order_num ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stages []*entity.Stage
	for rows.Next() {
		s := &entity.Stage{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum); err != nil {
			return nil, err
		}
		stages = append(stages, s)
	}
	return stages, rows.Err()
}

func (r *StageRepository) GetByID(id int) (*entity.Stage, error) {
	s := &entity.Stage{}
	row := r.db.QueryRow(`
		SELECT id, name, description, required_experience, order_num
		FROM stages WHERE id = ?
	`, id)
	err := row.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum)
	if err != nil {
		return nil, err
	}
	return s, nil
}
