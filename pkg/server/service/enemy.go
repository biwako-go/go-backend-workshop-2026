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
