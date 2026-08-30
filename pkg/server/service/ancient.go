package service

import "time"

// ancientLegend は解読済みの言い伝え。
var ancientLegend string

// DecodeAncientText は古文書を解読して言い伝えを返す。解読には800msかかる。
//
// [Lv27 バグ仕込み箇所]
// 解読結果は一度読めば変わらないのに、呼ばれるたびに解読し直しているため、
// ステージ選択画面を開くたびに800ms待たされる。
// sync.Once を使って「最初の1回だけ」解読するようにしよう。
func DecodeAncientText() string {
	time.Sleep(800 * time.Millisecond) // 古文書の解読には時間がかかる
	ancientLegend = "『五つの試練の先に、火を吐く王が眠る』"
	return ancientLegend
}
