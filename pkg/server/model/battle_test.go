package model

import "testing"

// TestApplyDamage は ApplyDamage 関数のテスト。
// テストケースを追加して、バグを見つけよう。
//
// 実行方法:
//
//	go test ./pkg/server/model/ -run TestApplyDamage -v
func TestApplyDamage(t *testing.T) {
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
			got := ApplyDamage(tt.currentHP, tt.damage)
			if got != tt.want {
				t.Errorf("ApplyDamage(%d, %d) = %d, want %d", tt.currentHP, tt.damage, got, tt.want)
			}
		})
	}
}
