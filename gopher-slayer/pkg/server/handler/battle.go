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
