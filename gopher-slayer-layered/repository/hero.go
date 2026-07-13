package repository

import (
	"database/sql"

	"github.com/maropook/gopher-slayer-layered/entity"
)

type HeroRepository struct {
	db *sql.DB
}

func NewHeroRepository(db *sql.DB) *HeroRepository {
	return &HeroRepository{db: db}
}

func (r *HeroRepository) Get() (*entity.Hero, error) {
	hero := &entity.Hero{}
	row := r.db.QueryRow(`
		SELECT id, name, hp, max_hp, attack, level, experience
		FROM heroes WHERE id = 1
	`)
	err := row.Scan(&hero.ID, &hero.Name, &hero.HP, &hero.MaxHP, &hero.Attack, &hero.Level, &hero.Experience)
	if err != nil {
		return nil, err
	}
	return hero, nil
}

func (r *HeroRepository) UpdateName(name string) error {
	_, err := r.db.Exec(`UPDATE heroes SET name = ? WHERE id = 1`, name)
	return err
}

func (r *HeroRepository) UpdateExperience(experience int) error {
	_, err := r.db.Exec(`UPDATE heroes SET experience = ? WHERE id = 1`, experience)
	return err
}

func (r *HeroRepository) UpdateHP(hp int) error {
	_, err := r.db.Exec(`UPDATE heroes SET hp = ? WHERE id = 1`, hp)
	return err
}
