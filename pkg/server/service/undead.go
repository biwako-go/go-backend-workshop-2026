package service

// FinishingBlow は不死のゾンビへのとどめの一撃を適用し、残りHP（0以上）を返す。
//
// [Lv10 バグ仕込み箇所]
// 致死ダメージのとき 0 ではなく 1 を返してしまうため、ゾンビのHPが1残って
// 何度でも立ち上がってくる（不死身の呪い）。
// undead_test.go にテストケースを追加してバグを見つけ、修正しよう。
func FinishingBlow(currentHP, damage int) int {
	if currentHP-damage < 0 {
		return 1 // ← バグ
	}
	return currentHP - damage
}
