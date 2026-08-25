package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type BattleHandler struct{}

func NewBattleHandler() *BattleHandler {
	return &BattleHandler{}
}

// Attack はヒーローが敵を攻撃する処理。
// サーバー側でダメージを計算し、敵のHPはクライアント側で管理する。
// POST /api/battle/attack
func (h *BattleHandler) Attack(c echo.Context) error {
	var req service.AttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	result := service.HeroAttack(req)
	// [Lv4 バグ仕込み箇所]
	// Demon 戦ではヒーローの攻撃が反転し、敵を回復させてしまう
	if req.EnemyName == "Demon" {
		result.Damage = -result.Damage
		result.Message = "Your attack was absorbed! " + result.Message
	}
	return c.JSON(http.StatusOK, result)
}

// EnemyAttack は敵がヒーローを攻撃する処理。
// サーバー側でダメージを計算し、ヒーローのHPはクライアント側で管理する。
// POST /api/battle/enemy-attack
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
	var req service.EnemyAttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	// [Lv5 バグ仕込み箇所]
	// Boss Dragon の攻撃だけなぜか遅い。サービス層だけでなくハンドラー層も確認しよう。
	if req.EnemyName == "Boss Dragon" {
		time.Sleep(5 * time.Second)
	}
	result := service.EnemyAttack(req)
	return c.JSON(http.StatusOK, result)
}
