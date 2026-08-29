package db

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/maropook/gopher-slayer/pkg/constant"
)

// Connect opens a MySQL connection with retry to handle Docker startup timing.
//
// [Lv14 バグ仕込み箇所]
// この関数内の log.Println / log.Printf / log.Fatal も
// log/slog の構造化ログに置き換えよう（リトライ回数を属性として持たせる）。
func Connect(cfg *constant.Config) *sql.DB {
	var conn *sql.DB
	var err error

	for i := 1; i <= 10; i++ {
		conn, err = sql.Open("mysql", cfg.DSN())
		if err == nil {
			if pingErr := conn.Ping(); pingErr == nil {
				log.Println("Connected to database")
				// [Lv24 バグ仕込み箇所]
				// コネクションプールが未設定（デフォルト＝接続数無制限）。
				// SetMaxOpenConns / SetMaxIdleConns / SetConnMaxLifetime を
				// ここで設定し、GET /api/debug/db で挙動を観測しよう。
				return conn
			}
		}
		log.Printf("Database not ready, retrying... (%d/10)", i)
		time.Sleep(2 * time.Second)
	}

	log.Fatal("Failed to connect to database after 10 attempts")
	return nil
}
