package repository

import (
	"database/sql"

	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type HeroRepository struct {
	db *sql.DB
}

func NewHeroRepository(db *sql.DB) *HeroRepository {
	return &HeroRepository{db: db}
}

// Get はヒーロー（id=1）を取得する。
func (r *HeroRepository) Get() (*service.Hero, error) {
	hero := &service.Hero{}
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

// UpdateName はヒーローの名前を更新する。
// Lv2の参考実装として使える。
func (r *HeroRepository) UpdateName(name string) error {
	_, err := r.db.Exec(`UPDATE heroes SET name = ? WHERE id = 1`, name)
	return err
}

// UpdateExperience はヒーローの経験値を更新する。
// Lv2のタスク（ClearStage）で呼び出す。
func (r *HeroRepository) UpdateExperience(experience int) error {
	_, err := r.db.Exec(`UPDATE heroes SET experience = ? WHERE id = 1`, experience)
	return err
}

// UpdateHP はヒーローの現在HPを更新する。
// Lv3のタスクでルートを追加することで呼び出せるようになる。
func (r *HeroRepository) UpdateHP(hp int) error {
	_, err := r.db.Exec(`UPDATE heroes SET hp = ? WHERE id = 1`, hp)
	return err
}
