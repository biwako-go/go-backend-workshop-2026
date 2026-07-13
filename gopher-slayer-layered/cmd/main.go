package main

import (
	"log"

	"github.com/joho/godotenv"
	"github.com/maropook/gopher-slayer-layered/pkg/constant"
	appdb "github.com/maropook/gopher-slayer-layered/pkg/db"
	"github.com/maropook/gopher-slayer-layered/pkg/server"
)

func main() {
	godotenv.Load()

	cfg := constant.Load()
	db := appdb.Connect(cfg)
	defer db.Close()

	e := server.New(db)

	log.Printf("Server starting on :%s", cfg.Port)
	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
