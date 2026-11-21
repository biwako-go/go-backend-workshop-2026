package service

import "iter"

// skeletonLegion は行進してくる骸骨兵の隊列（先頭から順に攻めてくる）。この変数は変更しなくてよい。
var skeletonLegion = []string{"骸骨兵", "骸骨弓兵", "骸骨騎士", "骸骨王", "残党の骸骨兵", "残党の骸骨弓兵"}

// SkeletonMarch は骸骨兵を先頭から1体ずつ送り出すイテレータ。
// Go 1.23 の range-over-func により、関数をそのまま for range で回せる:
//
//	for s := range SkeletonMarch() { ... }
//
// iter.Seq[string] の正体は func(yield func(string) bool) という関数。
// for の本体が1回実行されるたびに yield が1回呼ばれる。
// 本体が break や return で抜けると、yield は false を返す（「もう次はいらない」の合図）。
//
// [Lv29 バグ仕込み箇所]
// yield の戻り値を無視して、骸骨兵を最後まで送り出し続けている。
// 呼び出し側が break したあとにまた yield を呼ぶと、Go のランタイムが
// 「range function continued iteration after function for loop body returned false」で panic する。
// yield が false を返したら return して、行進を止めよう。
func SkeletonMarch() iter.Seq[string] {
	return func(yield func(string) bool) {
		for _, s := range skeletonLegion {
			yield(s)
		}
	}
}

// RepelSkeletonMarch は骸骨兵の行進を迎え撃ち、倒した順に名前を返す。
// 骸骨王を倒せば残りの兵は崩れ去るので、そこで break して戦いを終える。
// この関数は変更しなくてよい。
func RepelSkeletonMarch() []string {
	var defeated []string
	for s := range SkeletonMarch() {
		defeated = append(defeated, s)
		if s == "骸骨王" {
			break // 王を倒したら行進は止まる……はず
		}
	}
	return defeated
}
