package main

import (
	"log"

	"github.com/maropook/gopher-slayer/pkg/constant"
	appdb "github.com/maropook/gopher-slayer/pkg/db"
	"github.com/maropook/gopher-slayer/pkg/server"
)

func main() {
	cfg := constant.Load()
	db := appdb.Connect(cfg)
	defer db.Close()

	e := server.New(db)

	// [Lv14 バグ仕込み箇所]
	// log.Printf はテキスト形式のログなので集計・検索がしづらい。
	// Go 1.21 標準の log/slog を使った構造化ログに置き換えよう。
	log.Printf("Server starting on :%s", cfg.Port)

	// [Lv12 バグ仕込み箇所]
	// Ctrl+C でサーバーが即終了するため、処理中のリクエストが強制切断される。
	// signal.Notify でシグナルを受け取り、e.Shutdown(ctx) で
	// Graceful Shutdown（安全な撤退）を実装しよう。
	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
