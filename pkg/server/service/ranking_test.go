package service

import "testing"

// TestSortEnemiesByAttack はリファクタ前後で挙動が変わっていないことを守るテスト（Lv22）。
// slices.SortFunc に書き換えたあとも、このテストがそのまま通ればOK。
//
// 実行方法:
//
//	go test ./pkg/server/service/ -run "TestSortEnemiesByAttack|TestHasBoss" -v
func TestSortEnemiesByAttack(t *testing.T) {
	enemies := []*Enemy{
		{Name: "ゴブリン", Attack: 5},
		{Name: "ボスドラゴン", Attack: 50},
		{Name: "デーモン", Attack: 30},
	}
	SortEnemiesByAttack(enemies)

	want := []string{"ボスドラゴン", "デーモン", "ゴブリン"}
	for i, name := range want {
		if enemies[i].Name != name {
			t.Errorf("enemies[%d] = %s, want %s", i, enemies[i].Name, name)
		}
	}
}

func TestHasBoss(t *testing.T) {
	withBoss := []*Enemy{{Name: "ゴブリン"}, {Name: "ボスドラゴン"}}
	if !HasBoss(withBoss) {
		t.Error("HasBoss(withBoss) = false, want true")
	}
	withoutBoss := []*Enemy{{Name: "ゴブリン"}, {Name: "デーモン"}}
	if HasBoss(withoutBoss) {
		t.Error("HasBoss(withoutBoss) = true, want false")
	}
}
