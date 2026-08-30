package service

type Enemy struct {
	ID               int    `json:"id"`
	StageID          int    `json:"stage_id"`
	Name             string `json:"name"`
	HP               int    `json:"hp"`
	MaxHP            int    `json:"max_hp"`
	Attack           int    `json:"attack"`
	ExperienceReward int    `json:"experience_reward"`
}

// ChallengeEnemy はチャレンジ（Lv6〜Lv28）で対決する敵。
// unlock_exp に達するとカードが解放され、倒すと EXP +100 で次の敵が解放される。
type ChallengeEnemy struct {
	ID        int    `json:"id"`
	Action    string `json:"action"`
	Name      string `json:"name"`
	HP        int    `json:"hp"`
	MaxHP     int    `json:"max_hp"`
	Attack    int    `json:"attack"`
	UnlockExp int    `json:"unlock_exp"`
}
