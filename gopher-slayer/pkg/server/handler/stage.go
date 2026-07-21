package handler

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/model"
)

type StageHandler struct {
	db *sql.DB
}

func NewStageHandler(db *sql.DB) *StageHandler {
	return &StageHandler{db: db}
}

// GetStages は解放状況付きのステージ一覧を返す。
// GET /api/stages
func (h *StageHandler) GetStages(c echo.Context) error {
	hero, err := model.GetHero(h.db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	stages, err := model.GetAllStages(h.db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	// is_unlocked はヒーローの経験値とレベルで判定する
	for _, s := range stages {
		s.IsUnlocked = hero.Experience >= s.RequiredExperience && hero.Level >= s.RequiredLevel
	}
	return c.JSON(http.StatusOK, stages)
}

// GetEnemies は指定ステージの敵一覧を返す。
// GET /api/stages/:id/enemies
func (h *StageHandler) GetEnemies(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid stage id"})
	}
	enemies, err := model.GetEnemiesByStageID(h.db, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, enemies)
}

// ClearStage はステージをクリアし、ヒーローに経験値を付与する。
// POST /api/stages/:id/clear
//
// [Lv2 バグ仕込み箇所]
// バグ版では model.UpdateHeroExperience の呼び出しが削除されている。
// この処理を追加することで修正できる。
func (h *StageHandler) ClearStage(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid stage id"})
	}

	// 1. ステージを取得
	stage, err := model.GetStageByID(h.db, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "stage not found"})
	}

	// 2. ヒーローを取得
	hero, err := model.GetHero(h.db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to get hero"})
	}

	// 3. このステージの経験値合計を計算
	expGained, err := model.GetTotalExpForStage(h.db, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to calculate experience"})
	}

	newExp := hero.Experience + expGained

	// 4. 経験値をDBに保存する
	// [Lv2 バグ仕込み: この2行を削除するとバグになる]
	if err := model.UpdateHeroExperience(h.db, newExp); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update experience"})
	}

	return c.JSON(http.StatusOK, model.ClearStageResponse{
		Message:          fmt.Sprintf("Stage '%s' cleared!", stage.Name),
		ExperienceGained: expGained,
		NewExperience:    newExp,
	})
}
