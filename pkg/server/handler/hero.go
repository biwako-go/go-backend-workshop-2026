package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/repository"
	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type HeroHandler struct {
	repo *repository.HeroRepository
}

func NewHeroHandler(repo *repository.HeroRepository) *HeroHandler {
	return &HeroHandler{repo: repo}
}

// GetHero はヒーローの現在のステータスを返す。
// GET /api/hero
func (h *HeroHandler) GetHero(c echo.Context) error {
	hero, err := h.repo.Get()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, hero)
}

// UpdateName はヒーローの名前を更新する。
// PUT /api/hero/name
// Lv2の参考実装として使える。
func (h *HeroHandler) UpdateName(c echo.Context) error {
	var req service.UpdateNameRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "name is required"})
	}
	if err := h.repo.UpdateName(req.Name); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Name updated successfully"})
}

// UpdateExperience はヒーローの経験値を更新する。
// PUT /api/hero/experience
func (h *HeroHandler) UpdateExperience(c echo.Context) error {
	var req service.UpdateExperienceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if err := h.repo.UpdateExperience(req.Experience); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Experience updated successfully"})
}

// UpdateHP はヒーローの現在HPを更新する。
// PUT /api/hero/hp
//
// [Lv3 バグ仕込み箇所]
// このハンドラー自体は実装済みだが、バグ版では setting.go のルート登録がコメントアウトされているため404になる。
// api.PUT("/hero/hp", hero.UpdateHP) を追加することで修正できる。
func (h *HeroHandler) UpdateHP(c echo.Context) error {
	var req service.UpdateHPRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if req.HP <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "hp must be greater than 0"})
	}
	if err := h.repo.UpdateHP(req.HP); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "HP updated successfully"})
}
