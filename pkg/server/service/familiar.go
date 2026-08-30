package service

import "time"

// summonOne は使い魔を1体召喚する。使い魔は雑用を繰り返しこなす。
//
// [Lv24 バグ仕込み箇所]
// 使い魔（goroutine）に「もう帰っていいよ」と伝える手段がないため、
// 召喚するたびに永遠に働き続ける使い魔が増えていく。
// context.WithCancel で作った ctx を渡し、使い魔はループの中で
// select を使って ctx.Done() を確認し、合図が来たら return で帰れるようにしよう。
// 仕事が終わったら cancel() を呼んで全員に帰宅の合図を送る。
func summonOne() {
	go func() {
		for {
			time.Sleep(20 * time.Millisecond) // 雑用をこなす
		}
	}()
}

// SummonFamiliars は使い魔を10体召喚して働かせる。
// 100ms ほど働いてもらったら、全員おうちに帰すのが正しい姿。
func SummonFamiliars() {
	for i := 0; i < 10; i++ {
		summonOne()
	}
}
