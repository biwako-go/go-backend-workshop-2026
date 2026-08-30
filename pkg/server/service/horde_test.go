package service

import "testing"

// TestSlayHorde は群れ討伐を実行する（Lv17）。
// このテスト自体は討伐数を検証しないが、-race フラグ付きで実行すると
// SlayHorde 内のデータ競合が検出されて失敗する。
//
// 実行方法:
//
//	go test -race ./...
func TestSlayHorde(t *testing.T) {
	result := SlayHorde(100)
	t.Logf("討伐数: %d/%d", result.Slain, result.Total)
}
