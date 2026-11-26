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
		{name: "ぴったり倒せるケース", currentHP: 100, damage: 100, want: 0},
		{name: "ダメージを与えられなかったケース", currentHP: 100, damage: 0, want: 100},
		{name: "ダメージ超過ケース", currentHP: 100, damage: 1000, want: 0},
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
