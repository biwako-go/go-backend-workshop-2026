package model

import "database/sql"

type Hero struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	HP         int    `json:"hp"`
	MaxHP      int    `json:"max_hp"`
	Attack     int    `json:"attack"`
	Level      int    `json:"level"`
	Experience int    `json:"experience"`
}

type UpdateNameRequest struct {
	Name string `json:"name"`
}

type UpdateExperienceRequest struct {
	Experience int `json:"experience"`
}

type UpdateHPRequest struct {
	HP int `json:"hp"`
}

// GetHero はヒーロー（id=1）を取得する。
func GetHero(db *sql.DB) (*Hero, error) {
	hero := &Hero{}
	row := db.QueryRow(`
		SELECT id, name, hp, max_hp, attack, level, experience
		FROM heroes WHERE id = 1
	`)
	err := row.Scan(&hero.ID, &hero.Name, &hero.HP, &hero.MaxHP, &hero.Attack, &hero.Level, &hero.Experience)
	if err != nil {
		return nil, err
	}
	return hero, nil
}

// UpdateHeroName はヒーローの名前を更新する。
// Lv2の参考実装として使える。
func UpdateHeroName(db *sql.DB, name string) error {
	_, err := db.Exec(`UPDATE heroes SET name = ? WHERE id = 1`, name)
	return err
}

// UpdateHeroExperience はヒーローの経験値を更新する。
// Lv2のタスク（ClearStage）で呼び出す。
func UpdateHeroExperience(db *sql.DB, experience int) error {
	_, err := db.Exec(`UPDATE heroes SET experience = ? WHERE id = 1`, experience)
	return err
}

// UpdateHeroHP はヒーローの現在HPを更新する。
// Lv3のタスクでルートを追加することで呼び出せるようになる。
func UpdateHeroHP(db *sql.DB, hp int) error {
	_, err := db.Exec(`UPDATE heroes SET hp = ? WHERE id = 1`, hp)
	return err
}
