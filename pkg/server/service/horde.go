package service

import (
	"fmt"
	"sync"
	"time"
)

type HordeResponse struct {
	Slain   int    `json:"slain"`
	Total   int    `json:"total"`
	Message string `json:"message"`
}

// killCount はゴブリンの討伐数カウンタ。
var killCount int

// SlayHorde はゴブリンの群れを goroutine で同時に討伐する。
//
// [Lv17 バグ仕込み箇所]
// 複数の goroutine が mutex なしで同じ変数 killCount に書き込んでいるため、
// 討伐数がズレてしまう（データ競合）。go test -race ./... で検出できる。
// sync.Mutex（または sync/atomic）でカウンタを守るのが正解。
func SlayHorde(total int) HordeResponse {
	killCount = 0
	var wg sync.WaitGroup
	for i := 0; i < total; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			current := killCount        // 討伐数を読み取る
			time.Sleep(time.Microsecond) // 討伐の一瞬のスキ
			killCount = current + 1     // 討伐数を書き戻す
		}()
	}
	wg.Wait()

	message := fmt.Sprintf("群れを一掃した！討伐数 %d/%d", killCount, total)
	if killCount != total {
		message = fmt.Sprintf("%d体倒したはずが、記録は %d体しかない…！", total, killCount)
	}
	return HordeResponse{
		Slain:   killCount,
		Total:   total,
		Message: message,
	}
}
