package model

import "testing"

// TestCalcLevel は CalcLevel 関数の動作をテストする。
//
// テストを実行するコマンド:
//
//	go test ./pkg/server/model/... -v
//
// テストが失敗したら、battle.go の CalcLevel を見てバグを探そう。
func TestCalcLevel(t *testing.T) {
	tests := []struct {
		name       string
		experience int
		wantLevel  int
	}{
		{"初期状態", 0, 1},
		{"Lv1の途中", 50, 1},
		{"Lv1の上限", 99, 1},
		// ここにテストケースを追加してみよう
		// 例: {"Lv2の開始", 100, 2},
		// 例: {"Lv2の上限", 299, 2},
		// ヒント: 100, 300, 600 が境界値になっている
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalcLevel(tt.experience)
			if got != tt.wantLevel {
				t.Errorf("CalcLevel(%d) = %d, want %d", tt.experience, got, tt.wantLevel)
			}
		})
	}
}
