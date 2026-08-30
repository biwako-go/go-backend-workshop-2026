package service

import (
	"sync"
	"time"
)

// 同時に突撃している騎士の数を数えるカウンタ（判定用。この3つと下の2関数は変更しない）
var (
	assaultMu      sync.Mutex
	assaultCurrent int
	assaultPeak    int
)

func enterGate() {
	assaultMu.Lock()
	assaultCurrent++
	if assaultCurrent > assaultPeak {
		assaultPeak = assaultCurrent
	}
	assaultMu.Unlock()
}

func leaveGate() {
	assaultMu.Lock()
	assaultCurrent--
	assaultMu.Unlock()
}

// LaunchAssault は100人の騎士で城門に突撃する。
// ただし城門は狭く、同時に通れるのは5人まで。それ以上は門で団子になって自滅する。
// 戻り値は「同時に突撃していた騎士の最大数」。
//
// [Lv21 バグ仕込み箇所]
// 全騎士を一斉に goroutine で突撃させているため、同時突撃数が100に達してしまう。
// バッファ付き channel（容量5）をセマフォとして使い、
// 「入る前に枠を取り、出るときに枠を返す」形で同時実行数を5に制限しよう。
//
//	sem := make(chan struct{}, 5)
//	sem <- struct{}{} // 枠を取る（満員なら空くまで待つ）
//	<-sem             // 枠を返す
func LaunchAssault() int {
	assaultCurrent, assaultPeak = 0, 0
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			enterGate()
			time.Sleep(10 * time.Millisecond) // 城門を通り抜ける
			leaveGate()
		}()
	}
	wg.Wait()
	return assaultPeak
}
