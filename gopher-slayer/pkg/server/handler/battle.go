package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/model"
)

type BattleHandler struct{}

func NewBattleHandler() *BattleHandler {
	return &BattleHandler{}
}

// Attack はヒーローが敵を攻撃する処理。
// サーバー側でダメージを計算し、敵のHPはクライアント側で管理する。
// POST /api/battle/attack
func (h *BattleHandler) Attack(c echo.Context) error {
	var req model.AttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	result := model.HeroAttack(req)
	return c.JSON(http.StatusOK, result)
}

// EnemyAttack は敵がヒーローを攻撃する処理。
// サーバー側でダメージを計算し、ヒーローのHPはクライアント側で管理する。
// POST /api/battle/enemy-attack
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
	var req model.EnemyAttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	result := model.EnemyAttack(req)
	return c.JSON(http.StatusOK, result)
}

// BreakSeals はボスの封印を同時に解く処理。
// 2秒以内に全封印を解かないとボスのHPが回復してしまう。
// POST /api/battle/seals
func (h *BattleHandler) BreakSeals(c echo.Context) error {
	var req model.BreakSealsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if len(req.Attacks) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "attacks is required"})
	}
	result := model.BreakSeals(req)
	if !result.Success {
		return c.JSON(http.StatusUnprocessableEntity, result)
	}
	return c.JSON(http.StatusOK, result)
}
