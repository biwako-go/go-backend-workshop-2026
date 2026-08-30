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
	api.POST("/hero/revive", hero.Revive) // GameOver後の全回復（変更不要）

	// ステージ
	api.GET("/stages", stage.GetStages)
	api.GET("/stages/:id/enemies", stage.GetEnemies)
	api.POST("/stages/:id/clear", stage.ClearStage)
	api.POST("/stages/5/challenge", stage.ChallengeBoss)
	api.GET("/legend", stage.GetLegend)
	api.POST("/legend/speedread", stage.SpeedReadLegend)

	// チャレンジ（Lv6〜Lv28）の敵一覧
	api.GET("/challenges", stage.GetChallenges)

	// バトル
	api.POST("/battle/attack", battle.Attack)
	api.POST("/battle/enemy-attack", battle.EnemyAttack)
	api.POST("/battle/horde", battle.SlayHorde)
	api.POST("/battle/interrupt", battle.InterruptCast)
	api.POST("/battle/defuse", battle.Defuse)
	api.POST("/battle/report", battle.Report)
	api.POST("/battle/prophecy", battle.Prophecy)
	api.POST("/battle/scout", battle.Scout)
	api.POST("/battle/finish", battle.Finish)
	api.POST("/battle/mirror", battle.Mirror)
	api.POST("/battle/loot", battle.Loot)
	api.POST("/battle/titan", battle.Titan)
	api.POST("/battle/engrave", battle.Engrave)
	api.POST("/battle/mirage", battle.Mirage)
	api.POST("/battle/formation", battle.Formation)
	api.POST("/battle/vault", battle.Vault)
	api.POST("/battle/courier", battle.Courier)
	api.POST("/battle/assault", battle.Assault)
	api.POST("/battle/familiars", battle.Familiars)

	// モック（Lv20の相手役・変更不要）
	api.GET("/mock/guild", battle.MockGuild)

	// クエスト
	api.POST("/quests/gather", quest.Gather)

	// デバッグ（Lv22/Lv23 メモリ・goroutine観測用）
	api.GET("/debug/memory", debug.Memory)
}
