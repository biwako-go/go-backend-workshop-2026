package model

import "time"

// BreakAllSeals はボスに挑む前に5つの封印を解く。
//
// [Lv7 バグ仕込み箇所]
// 封印を順番に解いているので5秒かかってしまう。
// goroutine と sync.WaitGroup を使って並列化しよう。
func BreakAllSeals() []string {
	seals := []string{"炎の封印", "水の封印", "風の封印", "大地の封印", "闇の封印"}
	results := make([]string, len(seals))
	for i, seal := range seals {
		time.Sleep(1 * time.Second) // 各封印を解くのに1秒かかる
		results[i] = seal + "を解いた！"
	}
	return results
}
