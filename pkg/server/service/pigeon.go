package service

import "time"

// pigeonTowers は伝書鳩を飛ばす見張り塔と、往復にかかる時間。この変数は変更しなくてよい。
var pigeonTowers = []struct {
	name     string
	distance time.Duration
}{
	{"北の塔", 20 * time.Millisecond},
	{"東の塔", 40 * time.Millisecond},
	{"南の塔", 300 * time.Millisecond}, // 遠い塔の鳩は間に合わない
	{"西の塔", 300 * time.Millisecond},
	{"天空の塔", 300 * time.Millisecond},
}

// SendPigeons は見張り塔へ伝書鳩を飛ばし、返事を集める。
// ヒーローは100msだけ待って出発する（間に合わなかった塔の返事は諦める）。戻り値は間に合った返事。
//
// [Lv36 バグ仕込み箇所]
// 返事を受け取る channel（replies）がバッファなし。バッファなし channel への送信は、
// 受け取り手が現れるまでその場で止まる。ヒーローが出発したあとに戻ってきた鳩は、
// 誰も受け取らない channel の前で永遠に待ちぼうけになる（goroutine リーク）。
// Go 1.27 で標準になった goroutineleak プロファイルが、この待ちぼうけを見つけてくれる
// （GET /api/debug/goroutineleak で、どの行で止まっているかが見られる）。
// 受け取り手がいなくても返事を置いて帰れるように直そう。
func SendPigeons() []string {
	replies := make(chan string)
	for _, t := range pigeonTowers {
		go func() {
			time.Sleep(t.distance) // 塔まで往復する
			replies <- t.name + "：異常なし"
		}()
	}

	var got []string
	timeout := time.After(100 * time.Millisecond)
	for range pigeonTowers {
		select {
		case r := <-replies:
			got = append(got, r)
		case <-timeout:
			return got // 待ちきれずに出発（残りの鳩は置き去り）
		}
	}
	return got
}
