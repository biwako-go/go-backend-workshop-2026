package server

import (
	"database/sql"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/maropook/gopher-slayer/pkg/server/handler"
	"github.com/maropook/gopher-slayer/pkg/server/repository"
)

// New はEchoインスタンスを生成し、ミドルウェア・ルート・静的ファイルを設定して返す。
func New(db *sql.DB) *echo.Echo {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders: []string{"Content-Type"},
	}))

	// フロントエンドと静的ファイルを配信
	//
	// [Lv25 バグ仕込み箇所（リファクタ対象）]
	// 静的ファイルをディスクから読んでいるため、ビルドしたバイナリ単体では
	// ゲーム画面が表示できない。go:embed で _frontend をバイナリに埋め込み、
	// どこに持っていっても動く「単一バイナリ」にしよう。
	e.Static("/", "_frontend")
	e.Static("/images", "_frontend/images")

	// API仕様ファイルを配信
	e.File("/api-document.yaml", "api-document.yaml")

	// リポジトリの生成
	heroRepo := repository.NewHeroRepository(db)
	stageRepo := repository.NewStageRepository(db)
	enemyRepo := repository.NewEnemyRepository(db)

	// ハンドラーの生成
	heroHandler := handler.NewHeroHandler(heroRepo)
	stageHandler := handler.NewStageHandler(heroRepo, stageRepo, enemyRepo)
	battleHandler := handler.NewBattleHandler()
	questHandler := handler.NewQuestHandler()
	debugHandler := handler.NewDebugHandler(db)

	handler.RegisterRoutes(e, heroHandler, stageHandler, battleHandler, questHandler, debugHandler)

	return e
}
