package server

import (
	"database/sql"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/maropook/gopher-slayer-layered/handler"
	"github.com/maropook/gopher-slayer-layered/repository"
	"github.com/maropook/gopher-slayer-layered/service"
)

// New はEchoインスタンスを生成し、依存関係を組み立てて返す。
// repository → service → handler の順にnewして渡す（依存性注入）。
func New(db *sql.DB) *echo.Echo {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders: []string{"Content-Type"},
	}))

	e.Static("/", "_frontend")
	e.Static("/images", "_frontend/images")
	e.File("/api-document.yaml", "api-document.yaml")

	// repository層
	heroRepo := repository.NewHeroRepository(db)
	stageRepo := repository.NewStageRepository(db)
	enemyRepo := repository.NewEnemyRepository(db)

	// service層
	heroService := service.NewHeroService(heroRepo)
	battleService := service.NewBattleService()
	stageService := service.NewStageService(stageRepo, enemyRepo, heroRepo)

	// handler層
	heroHandler := handler.NewHeroHandler(heroService)
	stageHandler := handler.NewStageHandler(stageService)
	battleHandler := handler.NewBattleHandler(battleService)

	handler.RegisterRoutes(e, heroHandler, stageHandler, battleHandler)

	return e
}
