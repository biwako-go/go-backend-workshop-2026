package service

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
