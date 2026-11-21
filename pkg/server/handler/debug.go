package handler

import (
	"bytes"
	"net/http"
	"runtime"
	"runtime/pprof"

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

// GoroutineLeak は「漏れた goroutine」（誰にも起こされずに永遠に止まっている goroutine）の
// スタックトレースを返す。Go 1.27 で標準になった goroutineleak プロファイルを使う。
// Lv36（待ちぼうけの伝書鳩）の観測に使う。このファイルは変更しなくてよい。
// GET /api/debug/goroutineleak
func (h *DebugHandler) GoroutineLeak(c echo.Context) error {
	p := pprof.Lookup("goroutineleak")
	if p == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "goroutineleak プロファイルがありません（Go 1.27 以上で起動してください）"})
	}
	var buf bytes.Buffer
	if err := p.WriteTo(&buf, 1); err != nil { // 取得時にリーク検出用のGCが1回走る
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.String(http.StatusOK, buf.String())
}
