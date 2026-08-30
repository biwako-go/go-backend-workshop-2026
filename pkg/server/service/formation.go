package service

// FormBattleLine は討伐隊の隊列を組む。
// 隊列は呼ぶたびに同じ順序でなければならない。
//
// [Lv13 バグ仕込み箇所]
// Goの map を for range で回す順序は「毎回ランダム」と言語仕様で決まっている。
// そのまま隊列にすると、組むたびに並び順がバラバラになる。
// 名前を取り出したあと slices.Sort で並べ替えて、隊列を安定させよう。
func FormBattleLine() []string {
	members := map[string]bool{
		"アルフ": true, "ブラン": true, "セレン": true, "ドルフ": true,
		"エリク": true, "フィオ": true, "ガルム": true, "ヒルダ": true,
	}
	var line []string
	for name := range members {
		line = append(line, name)
	}
	return line
}
