package service

// EngraveName は討伐碑に敵の名前を刻む。長い名前は先頭5文字に切り詰める。
//
// [Lv11 バグ仕込み箇所]
// Goの string に対する len() は「文字数」ではなく「バイト数」を返し、
// name[:5] も「先頭5バイト」で切る。日本語は1文字が3バイトあるため、
// 文字のド真ん中でちぎれて名前が壊れる（文字化け）。
// []rune(name) に変換すると「1文字＝1要素」になる。rune で数えて切り詰めよう。
func EngraveName(name string) string {
	if len(name) > 5 {
		return name[:5]
	}
	return name
}
