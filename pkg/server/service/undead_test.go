package service

import "testing"

// TestFinishingBlow は FinishingBlow 関数のテスト（Lv10）。
// テストケースを追加して、バグを見つけよう。
//
// 実行方法:
//
//	go test ./pkg/server/service/ -run TestFinishingBlow -v
func TestFinishingBlow(t *testing.T) {
	tests := []struct {
		name      string
		currentHP int
		damage    int
		want      int
	}{
		// ここにテストケースを追加しよう
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FinishingBlow(tt.currentHP, tt.damage)
			if got != tt.want {
				t.Errorf("FinishingBlow(%d, %d) = %d, want %d", tt.currentHP, tt.damage, got, tt.want)
			}
		})
	}
}
