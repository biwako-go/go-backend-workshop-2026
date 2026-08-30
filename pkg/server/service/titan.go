package service

// ChallengeTitan は巨神Gopherに25ダメージ×30回の連続攻撃を加え、
// 与えた合計ダメージを返す。正しくは 750 になるはず。
//
// [Lv9 バグ仕込み箇所]
// 合計を int8 で数えている。int8 に入るのは -128〜127 だけなので、
// 加算の途中でオーバーフローして値がぐるっと一周してしまう。
// Goの整数型には入る値の範囲がある。int に変えよう。
func ChallengeTitan() int {
	var total int8
	for i := 0; i < 30; i++ {
		total += 25
	}
	return int(total)
}
