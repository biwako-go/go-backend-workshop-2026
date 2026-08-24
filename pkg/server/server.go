package server

import (
	"database/sql"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/maropook/gopher-slayer/pkg/server/handler"
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
	e.Static("/", "_frontend")
	e.Static("/images", "_frontend/images")

	// API仕様ファイルを配信
	e.File("/api-document.yaml", "api-document.yaml")

	// ハンドラーの生成
	heroHandler := handler.NewHeroHandler(db)
	stageHandler := handler.NewStageHandler(db)
	battleHandler := handler.NewBattleHandler()

	handler.RegisterRoutes(e, heroHandler, stageHandler, battleHandler)

	return e
}
