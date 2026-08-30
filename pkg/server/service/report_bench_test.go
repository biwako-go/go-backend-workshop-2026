package service

import "testing"

// BenchmarkBuildBattleReport は戦闘レポート生成のベンチマーク。
// Lv26: まず現状を計測し、strings.Builder に書き換えて B/op と ns/op を比べよう。
//
// 実行方法:
//
//	go test ./pkg/server/service/ -bench BuildBattleReport -benchmem
func BenchmarkBuildBattleReport(b *testing.B) {
	// 1000行分の戦闘ログを用意する
	logs := make([]string, 1000)
	for i := range logs {
		logs[i] = "ゴブリンに 12 ダメージを与えた！ゴブリンの反撃！ヒーローは 8 ダメージを受けた！"
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		BuildBattleReport(logs)
	}
}
