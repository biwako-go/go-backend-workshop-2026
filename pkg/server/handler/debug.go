package handler

import (
	"net/http"
	"runtime"

	"github.com/labstack/echo/v4"
)

type DebugHandler struct{}

func NewDebugHandler() *DebugHandler {
	return &DebugHandler{}
}

// Memory はサーバーのメモリ・goroutineの状況を返す。
// Lv23（怨念＝メモリリーク）と Lv22（悪霊＝goroutineリーク）の観測に使う。
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
