package handler

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer-layered/service"
)

type StageHandler struct {
	stageService *service.StageService
}

func NewStageHandler(stageService *service.StageService) *StageHandler {
	return &StageHandler{stageService: stageService}
}

// GetStages は解放状況付きのステージ一覧を返す。
// GET /api/stages
func (h *StageHandler) GetStages(c echo.Context) error {
	stages, err := h.stageService.GetStagesWithUnlockStatus()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
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
	enemies, err := h.stageService.GetEnemiesByStage(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, enemies)
}

// ClearStage はステージをクリアし、ヒーローに経験値を付与する。
// POST /api/stages/:id/clear
func (h *StageHandler) ClearStage(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid stage id"})
	}
	result, err := h.stageService.ClearStage(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, result)
}
