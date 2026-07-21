package handler

import "github.com/labstack/echo/v4"

// RegisterRoutes はすべてのAPIルートを登録する。
func RegisterRoutes(e *echo.Echo, hero *HeroHandler, stage *StageHandler, battle *BattleHandler) {
	api := e.Group("/api")

	// ヒーロー
	api.GET("/hero", hero.GetHero)
	api.PUT("/hero/name", hero.UpdateName)
	api.PUT("/hero/experience", hero.UpdateExperience)
	// [Lv3 実装箇所]
	// UpdateHP の実装が完成したら、ここにルートを追加しよう。
	// api.PUT("/hero/hp", hero.UpdateHP)

	// ステージ
	api.GET("/stages", stage.GetStages)
	api.GET("/stages/:id/enemies", stage.GetEnemies)
	api.POST("/stages/:id/clear", stage.ClearStage)

	// バトル
	api.POST("/battle/attack", battle.Attack)
	api.POST("/battle/enemy-attack", battle.EnemyAttack)
	api.POST("/battle/seals", battle.BreakSeals)
}
