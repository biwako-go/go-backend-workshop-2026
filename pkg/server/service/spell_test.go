package service

import (
	"testing"
	"testing/synctest"
	"time"
)

// TestInterruptCast は詠唱中断のテスト（Lv23）。
//
// 実時間では2〜10秒かかる処理だが、Go 1.25 の testing/synctest を使うと
// バブル内の time.Sleep や time.After が「仮想時間」で進むため一瞬で終わる。
//
// Lv11 を修正してから下の Skip を消して実行しよう:
//
//	go test ./pkg/server/service/ -run TestInterruptCast -v
//
// ヒント: Skip を消して実行すると、テストは deadlock で panic するはず。
// synctest が「詠唱 goroutine が永遠にブロックしたまま残る」という
// goroutine リークを暴いてくれる。castSpell の channel をバッファ付き
// （make(chan string, 1)）にすると、送信側がブロックせずに終了できる。
func TestInterruptCast(t *testing.T) {
	t.Skip("Lv11 を修正してからこの行を消して挑戦しよう")
	synctest.Test(t, func(t *testing.T) {
		message, interrupted := InterruptCast()
		if !interrupted {
			t.Errorf("詠唱を中断できなかった: %s", message)
		}
		// ボスの詠唱（10秒）が終わるまで仮想時間で待つ（実時間は一瞬）。
		// 詠唱goroutineがここで終了できないままだと、
		// synctest が deadlock（goroutineリーク）として教えてくれる。
		time.Sleep(10 * time.Second)
	})
}
