package service

import (
	"sync"
	"sync/atomic"
	"time"
)

// MusterReinforcements は援軍10部隊を呼び寄せ、全部隊の到着を待ってから出陣する。
// 戻り値は「出陣した時点で到着していた部隊数」（正しく待てていれば必ず10）。
//
// [Lv31 バグ仕込み箇所]
// wg.Add(1) を goroutine の「中」で呼んでいる。goroutine が動き出すより先に
// wg.Wait() にたどり着くと、カウンタは 0 のまま＝「待つ相手はいない」と判断され、
// 援軍を置き去りにして出陣してしまう。たまたま間に合う回もあるのが厄介なところ。
// go vet ./... を実行すると、この書き方の誤りを指摘してくれる。
// Go 1.25 で追加された wg.Go(func() { ... }) を使えば、Add と Done を自分で書かずに済み、間違えようがない。
func MusterReinforcements() int {
	var wg sync.WaitGroup
	var arrived atomic.Int32 // 到着した部隊数（atomic で数えているので、ここは正しい）
	for range 10 {
		go func() {
			wg.Add(1)
			defer wg.Done()
			time.Sleep(20 * time.Millisecond) // 戦場へ駆けつける
			arrived.Add(1)
		}()
	}
	wg.Wait() // 全部隊の到着を待つ……はず
	return int(arrived.Load())
}
