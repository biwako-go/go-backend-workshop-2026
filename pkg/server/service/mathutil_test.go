package service

import "testing"

// TestMax は Max 系関数のテスト（Lv21）。
// ジェネリクス化したら MaxInt / MaxFloat64 の呼び出しを Max に書き換えよう
// （Max(3, 5) のように型は推論してくれる）。
//
// 実行方法:
//
//	go test ./pkg/server/service/ -run TestMax -v
func TestMax(t *testing.T) {
	if got := MaxInt(3, 5); got != 5 {
		t.Errorf("MaxInt(3, 5) = %d, want 5", got)
	}
	if got := MaxInt(10, -2); got != 10 {
		t.Errorf("MaxInt(10, -2) = %d, want 10", got)
	}
	if got := MaxFloat64(1.5, 2.5); got != 2.5 {
		t.Errorf("MaxFloat64(1.5, 2.5) = %f, want 2.5", got)
	}
}
