package handler

import (
	"database/sql"
	"net/http"
	"runtime"

	"github.com/labstack/echo/v4"
)

type DebugHandler struct {
	db *sql.DB
}

func NewDebugHandler(db *sql.DB) *DebugHandler {
	return &DebugHandler{db: db}
}

// Memory はサーバーのメモリ・goroutineの状況を返す。
// Lv9（怨念＝メモリリーク）と Lv17（悪霊＝goroutineリーク）の観測に使う。
// このファイルは変更しなくてよい。
// GET /api/debug/memory
func (h *DebugHandler) Memory(c echo.Context) error {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"heap_alloc_mb": m.HeapAlloc / 1024 / 1024, // 現在ヒープに確保されているメモリ量(MB)
		"num_gc":        m.NumGC,                   // GCが実行された回数
		"num_goroutine": runtime.NumGoroutine(),    // 現在のgoroutine数
	})
}

// DBStats はDBコネクションプールの統計を返す。
// Lv24（コネクションプール設定）の観測に使う。このファイルは変更しなくてよい。
// GET /api/debug/db
func (h *DebugHandler) DBStats(c echo.Context) error {
	s := h.db.Stats()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"max_open":         s.MaxOpenConnections, // プールの上限（0は無制限）
		"open_connections": s.OpenConnections,    // 現在開いている接続数
		"in_use":           s.InUse,              // 使用中の接続数
		"idle":             s.Idle,               // 待機中の接続数
		"wait_count":       s.WaitCount,          // 接続待ちが発生した回数
	})
}
