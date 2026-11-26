package service

// FinishingBlow は不死のゾンビへのとどめの一撃を適用し、残りHP（0以上）を返す。
func FinishingBlow(currentHP, damage int) int {
	if currentHP-damage < 0 {
		return 0 // ← バグ
	}
	return currentHP - damage
}
