package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer-layered/service"
)

type BattleHandler struct {
	battleService *service.BattleService
}

func NewBattleHandler(battleService *service.BattleService) *BattleHandler {
	return &BattleHandler{battleService: battleService}
}

type attackRequest struct {
	HeroAttack int `json:"hero_attack"`
}

type enemyAttackRequest struct {
	EnemyAttack int    `json:"enemy_attack"`
	EnemyName   string `json:"enemy_name"`
}

// Attack はヒーローが敵を攻撃する処理。
// POST /api/battle/attack
func (h *BattleHandler) Attack(c echo.Context) error {
	var req attackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	result := h.battleService.HeroAttack(req.HeroAttack)
	return c.JSON(http.StatusOK, result)
}

// EnemyAttack は敵がヒーローを攻撃する処理。
// POST /api/battle/enemy-attack
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
	var req enemyAttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	result := h.battleService.EnemyAttack(req.EnemyAttack, req.EnemyName)
	return c.JSON(http.StatusOK, result)
}
