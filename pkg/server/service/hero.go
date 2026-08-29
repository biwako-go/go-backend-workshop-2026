package service

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
