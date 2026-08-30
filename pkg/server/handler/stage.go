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

// GetChallenges はチャレンジ（Lv6〜Lv28）の敵一覧を返す。このハンドラーは変更しなくてよい。
// GET /api/challenges
func (h *StageHandler) GetChallenges(c echo.Context) error {
	enemies, err := h.enemyRepo.GetChallenges()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, enemies)
}

// GetLegend は古文書の言い伝えを返す。
// ステージ選択画面を開くたびに呼ばれる（Lv27: 毎回800msかかるのが症状）。
// GET /api/legend
func (h *StageHandler) GetLegend(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"legend": service.DecodeAncientText()})
}

// SpeedReadLegend は古文書の速読チャレンジ（Lv27の判定用）。
// 2回続けて解読し、2回目が一瞬で終わるかを判定する。
// POST /api/legend/speedread
func (h *StageHandler) SpeedReadLegend(c echo.Context) error {
	start := time.Now()
	service.DecodeAncientText()
	first := time.Since(start)

	start = time.Now()
	service.DecodeAncientText()
	second := time.Since(start)

	if second > 200*time.Millisecond {
		return c.JSON(http.StatusRequestTimeout, map[string]interface{}{
			"error":     "2回目の解読にも時間がかかっている…毎回ゼロから解読し直しているようだ",
			"first_ms":  first.Milliseconds(),
			"second_ms": second.Milliseconds(),
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":   "2回目は一瞬で読めた！解読結果がしっかり記憶されている！",
		"first_ms":  first.Milliseconds(),
		"second_ms": second.Milliseconds(),
	})
}

// GetEnemies は指定ステージの敵一覧を返す。
// GET /api/stages/:id/enemies
func (h *StageHandler) GetEnemies(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "ステージIDが不正です"})
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
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "ステージIDが不正です"})
	}

	// 1. ステージを取得
	stage, err := h.stageRepo.GetByID(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "ステージが見つかりません"})
	}

	// 2. ヒーローを取得
	hero, err := h.heroRepo.Get()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "ヒーローの取得に失敗しました"})
	}

	// 3. このステージの経験値合計を計算
	expGained, err := h.stageRepo.GetTotalExp(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "経験値の計算に失敗しました"})
	}

	newExp := hero.Experience + expGained

	// 4. 経験値をDBに保存する
	// [Lv2 バグ仕込み箇所]
	// ここにDBへの保存処理が抜けている

	return c.JSON(http.StatusOK, service.ClearStageResponse{
		Message:          fmt.Sprintf("ステージ「%s」クリア！", stage.Name),
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
