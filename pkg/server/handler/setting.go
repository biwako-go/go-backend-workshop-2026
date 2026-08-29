package handler

import "github.com/labstack/echo/v4"

// RegisterRoutes はすべてのAPIルートを登録する。
func RegisterRoutes(e *echo.Echo, hero *HeroHandler, stage *StageHandler, battle *BattleHandler, quest *QuestHandler, debug *DebugHandler) {
	api := e.Group("/api")

	// ヒーロー
	api.GET("/hero", hero.GetHero)
	api.PUT("/hero/name", hero.UpdateName)
	api.PUT("/hero/experience", hero.UpdateExperience)
	// [Lv3 バグ仕込み箇所]
	// ここにHP更新のルートを追加してください。
	// api.PUT("/hero/hp", hero.UpdateHP)

	// ステージ
	api.GET("/stages", stage.GetStages)
	api.GET("/stages/:id/enemies", stage.GetEnemies)
	api.POST("/stages/:id/clear", stage.ClearStage)
	api.POST("/stages/5/challenge", stage.ChallengeBoss)
	api.GET("/legend", stage.GetLegend)

	// バトル
	api.POST("/battle/attack", battle.Attack)
	api.POST("/battle/enemy-attack", battle.EnemyAttack)
	api.POST("/battle/horde", battle.SlayHorde)
	api.POST("/battle/interrupt", battle.InterruptCast)
	api.POST("/battle/defuse", battle.Defuse)

	// クエスト
	api.POST("/quests/gather", quest.Gather)

	// デバッグ（Lv9/Lv17 メモリ・goroutine観測、Lv24 DBプール観測用）
	api.GET("/debug/memory", debug.Memory)
	api.GET("/debug/db", debug.DBStats)
}
