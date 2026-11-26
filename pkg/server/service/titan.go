package service

// ChallengeTitan は巨神Gopherに25ダメージ×30回の連続攻撃を加え、
// 与えた合計ダメージを返す。正しくは 750 になるはず。
func ChallengeTitan() int {
	var total int
	for i := 0; i < 30; i++ {
		total += 25
	}
	return total
}
