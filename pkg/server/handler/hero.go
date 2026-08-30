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
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの形式が正しくありません"})
	}
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "名前を入力してください"})
	}
	if err := h.repo.UpdateName(req.Name); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "名前を更新しました"})
}

// UpdateExperience はヒーローの経験値を更新する。
// PUT /api/hero/experience
func (h *HeroHandler) UpdateExperience(c echo.Context) error {
	var req service.UpdateExperienceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの形式が正しくありません"})
	}
	if err := h.repo.UpdateExperience(req.Experience); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "経験値を更新しました"})
}

// Revive はゲームオーバー後にヒーローのHPを最大値まで全回復する。
// GameOver演出から呼ばれる補助API（変更不要）。Lv3の PUT /hero/hp とは別物。
// POST /api/hero/revive
func (h *HeroHandler) Revive(c echo.Context) error {
	hero, err := h.repo.Get()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if err := h.repo.UpdateHP(hero.MaxHP); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "ヒーローは立ち上がった！HPが全回復した！",
		"hp":      hero.MaxHP,
	})
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
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの形式が正しくありません"})
	}
	if req.HP <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "HPは1以上の値を指定してください"})
	}
	if err := h.repo.UpdateHP(req.HP); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "HPを更新しました"})
}
