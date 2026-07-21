package handler

import (
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/model"
)

type HeroHandler struct {
	db *sql.DB
}

func NewHeroHandler(db *sql.DB) *HeroHandler {
	return &HeroHandler{db: db}
}

// GetHero はヒーローの現在のステータスを返す。
// GET /api/hero
func (h *HeroHandler) GetHero(c echo.Context) error {
	hero, err := model.GetHero(h.db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, hero)
}

// UpdateName はヒーローの名前を更新する。
// PUT /api/hero/name
// Lv2の参考実装として使える。
func (h *HeroHandler) UpdateName(c echo.Context) error {
	var req model.UpdateNameRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "name is required"})
	}
	if err := model.UpdateHeroName(h.db, req.Name); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Name updated successfully"})
}

// UpdateExperience はヒーローの経験値を更新する。
// PUT /api/hero/experience
func (h *HeroHandler) UpdateExperience(c echo.Context) error {
	var req model.UpdateExperienceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if err := model.UpdateHeroExperience(h.db, req.Experience); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Experience updated successfully"})
}

// UpdateHP はヒーローの現在HPを更新する。
// PUT /api/hero/hp
//
// [Lv3 実装箇所]
// UpdateName を参考に実装しよう。
func (h *HeroHandler) UpdateHP(c echo.Context) error {
	// ここに実装する
	return nil
}
