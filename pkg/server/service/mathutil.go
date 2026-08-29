package service

// MaxInt は2つの int の大きい方を返す。
//
// [Lv21 バグ仕込み箇所（リファクタ対象）]
// 型が違うだけのほぼ同じ関数が2つ並んでいる。
// ジェネリクス（型パラメータ）と cmp.Ordered を使って、
// Max[T cmp.Ordered](a, b T) T の1つにまとめよう。
// テスト（mathutil_test.go）も新しい関数に合わせて書き換えること。
func MaxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// MaxFloat64 は2つの float64 の大きい方を返す。
func MaxFloat64(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
