package db

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/maropook/gopher-slayer-layered/pkg/constant"
)

func Connect(cfg *constant.Config) *sql.DB {
	var conn *sql.DB
	var err error

	for i := 1; i <= 10; i++ {
		conn, err = sql.Open("mysql", cfg.DSN())
		if err == nil {
			if pingErr := conn.Ping(); pingErr == nil {
				log.Println("Connected to database")
				return conn
			}
		}
		log.Printf("Database not ready, retrying... (%d/10)", i)
		time.Sleep(2 * time.Second)
	}

	log.Fatal("Failed to connect to database after 10 attempts")
	return nil
}
