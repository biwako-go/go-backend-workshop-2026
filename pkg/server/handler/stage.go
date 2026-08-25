package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/repository"
	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type StageHandler struct {
	heroRepo  *repository.HeroRepository
	stageRepo *repository.StageRepository
	enemyRepo *repository.EnemyRepository
}

func NewStageHandler(heroRepo *repository.HeroRepository, stageRepo *repository.StageRepository, enemyRepo *repository.EnemyRepository) *StageHandler {
	return &StageHandler{heroRepo: heroRepo, stageRepo: stageRepo, enemyRepo: enemyRepo}
}

// GetStages は解放状況付きのステージ一覧を返す。
// GET /api/stages
func (h *StageHandler) GetStages(c echo.Context) error {
	hero, err := h.heroRepo.Get()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	stages, err := h.stageRepo.GetAll()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	// is_unlocked はヒーローの経験値と比較して設定する
	for _, s := range stages {
		s.IsUnlocked = hero.Experience >= s.RequiredExperience
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
	enemies, err := h.enemyRepo.GetByStageID(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, enemies)
}

// ClearStage はステージをクリアし、ヒーローに経験値を付与する。
// POST /api/stages/:id/clear
//
// [Lv2 バグ仕込み箇所]
// バグ版では heroRepo.UpdateExperience の呼び出しが削除されている。
// この処理を追加することで修正できる。
func (h *StageHandler) ClearStage(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid stage id"})
	}

	// 1. ステージを取得
	stage, err := h.stageRepo.GetByID(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "stage not found"})
	}

	// 2. ヒーローを取得
	hero, err := h.heroRepo.Get()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to get hero"})
	}

	// 3. このステージの経験値合計を計算
	expGained, err := h.stageRepo.GetTotalExp(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to calculate experience"})
	}

	newExp := hero.Experience + expGained

	// 4. 経験値をDBに保存する
	// [Lv2 バグ仕込み箇所]
	// ここにDBへの保存処理が抜けている
	if err := h.heroRepo.UpdateExperience(newExp); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update experience"})
	}

	return c.JSON(http.StatusOK, service.ClearStageResponse{
		Message:          fmt.Sprintf("Stage '%s' cleared!", stage.Name),
		ExperienceGained: expGained,
		NewExperience:    newExp,
	})
}

// ChallengeBoss はボスに挑む前に封印を解く。
// 3秒以内に全封印を解けないとボスは待ってくれない。
// POST /api/stages/5/challenge
func (h *StageHandler) ChallengeBoss(c echo.Context) error {
	start := time.Now()
	results := service.BreakAllSeals()
	if time.Since(start) > 3*time.Second {
		return c.JSON(http.StatusRequestTimeout, map[string]string{
			"error": "封印解除が遅すぎる！3秒以内に解かないとボスは待ってくれない",
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "すべての封印を解いた！ボスと戦える！",
		"seals":   results,
	})
}
