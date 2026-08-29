package service

import "time"

// DefuseCurse は呪いの爆弾の解除を試みる。1秒後に爆発判定が走る。
//
// [Lv18 バグ仕込み箇所]
// goroutine の中で起きた panic は、Echo の Recover ミドルウェアでは拾えず
// サーバーごと落ちる（Recover が守れるのはリクエストを処理している
// goroutine だけ）。自分で起動した goroutine の先頭に defer + recover() を
// 仕込んで、爆発を受け止めるのが正解。
func DefuseCurse() string {
	go func() {
		time.Sleep(1 * time.Second)
		panic("呪いの爆弾が爆発した！")
	}()
	return "解除を試みた……（1秒後に何かが起こる）"
}
