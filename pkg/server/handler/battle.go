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
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの形式が正しくありません"})
	}
	result := service.HeroAttack(req)
	// [Lv4 バグ仕込み箇所]
	// デーモン戦ではヒーローの攻撃が反転し、敵を回復させてしまう
	if req.EnemyName == "デーモン" {
		result.Damage = -result.Damage
		result.Message = "攻撃が吸収された！" + result.Message
	}
	return c.JSON(http.StatusOK, result)
}

// SlayHorde はゴブリンの群れを一掃する処理。
// POST /api/battle/horde
func (h *BattleHandler) SlayHorde(c echo.Context) error {
	result := service.SlayHorde(100)
	return c.JSON(http.StatusOK, result)
}

// Defuse は呪いの爆弾の解除を試みる処理。
// POST /api/battle/defuse
func (h *BattleHandler) Defuse(c echo.Context) error {
	message := service.DefuseCurse()
	return c.JSON(http.StatusOK, map[string]string{"message": message})
}

// InterruptCast はボスの詠唱の中断を試みる処理。
// POST /api/battle/interrupt
func (h *BattleHandler) InterruptCast(c echo.Context) error {
	message, interrupted := service.InterruptCast()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":     message,
		"interrupted": interrupted,
	})
}

// EnemyAttack は敵がヒーローを攻撃する処理。
// サーバー側でダメージと新しいHP（ApplyDamage適用後）を計算して返す。
// POST /api/battle/enemy-attack
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
	var req service.EnemyAttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの形式が正しくありません"})
	}
	// [Lv5 バグ仕込み箇所]
	// ボスドラゴンの攻撃だけなぜか遅い。サービス層だけでなくハンドラー層も確認しよう。
	if req.EnemyName == "ボスドラゴン" {
		time.Sleep(5 * time.Second)
	}
	result := service.EnemyAttack(req)
	return c.JSON(http.StatusOK, result)
}
