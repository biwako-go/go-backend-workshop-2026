package service

import (
	"math/rand"
	"strings"
)

// Prophecy は予言者による会心予知。Lv28の判定に使う。このファイルは変更しない。
//
// 実際の会心判定を40回引き、その並びが「固定シード1の math/rand が生み出す列」の
// どこかの区間と一致するかを調べる。一致すれば、判定は予測可能な列の上を
// 歩いているだけ＝バグあり。math/rand/v2 に移行すれば列は毎回変わり、予言は外れる。
// （どこから引き始めても検出できるので、これまでの判定回数を数える必要はない）
func Prophecy() (predicted, actual []bool, allMatch bool) {
	const rolls = 40
	results := make([]bool, 0, rolls)
	for i := 0; i < rolls; i++ {
		results = append(results, RollCritical())
	}

	// 固定シード1の列を十分な長さだけ再現する
	replay := rand.New(rand.NewSource(1))
	var stream strings.Builder
	for i := 0; i < 200000; i++ {
		if replay.Intn(4) == 0 {
			stream.WriteByte('1')
		} else {
			stream.WriteByte('0')
		}
	}
	var pattern strings.Builder
	for _, r := range results {
		if r {
			pattern.WriteByte('1')
		} else {
			pattern.WriteByte('0')
		}
	}

	pos := strings.Index(stream.String(), pattern.String())
	allMatch = pos >= 0

	// 画面表示用: 先頭12回分の「予言」と「実際」
	actual = results[:12]
	streamStr := stream.String()
	start := 0
	if pos >= 0 {
		start = pos // バグあり: 予言は実際の判定と完全一致する
	}
	for i := start; i < start+12; i++ {
		predicted = append(predicted, streamStr[i] == '1')
	}
	return predicted, actual, allMatch
}
