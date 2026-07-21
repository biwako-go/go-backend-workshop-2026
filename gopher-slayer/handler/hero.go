package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer-layered/service"
)

type HeroHandler struct {
	heroService *service.HeroService
}

func NewHeroHandler(heroService *service.HeroService) *HeroHandler {
	return &HeroHandler{heroService: heroService}
}

type updateNameRequest struct {
	Name string `json:"name"`
}

type updateExperienceRequest struct {
	Experience int `json:"experience"`
}

type updateHPRequest struct {
	HP int `json:"hp"`
}

// GetHero はヒーローの現在のステータスを返す。
// GET /api/hero
func (h *HeroHandler) GetHero(c echo.Context) error {
	hero, err := h.heroService.Get()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, hero)
}

// UpdateName はヒーローの名前を更新する。
// PUT /api/hero/name
func (h *HeroHandler) UpdateName(c echo.Context) error {
	var req updateNameRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if err := h.heroService.UpdateName(req.Name); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Name updated successfully"})
}

// UpdateExperience はヒーローの経験値を更新する。
// PUT /api/hero/experience
func (h *HeroHandler) UpdateExperience(c echo.Context) error {
	var req updateExperienceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if err := h.heroService.UpdateExperience(req.Experience); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Experience updated successfully"})
}

// UpdateHP はヒーローの現在HPを更新する。
// PUT /api/hero/hp
func (h *HeroHandler) UpdateHP(c echo.Context) error {
	var req updateHPRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if err := h.heroService.UpdateHP(req.HP); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "HP updated successfully"})
}
