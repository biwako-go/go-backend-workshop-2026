package service

import "time"

// castSpell はボスの詠唱。完了までに10秒かかる。
// この関数は変更しなくてよい。
func castSpell() <-chan string {
	done := make(chan string, 1)
	go func() {
		time.Sleep(10 * time.Second)
		done <- "メテオ"
	}()
	return done
}

// InterruptCast はボスの詠唱の中断を試みる。
// 戻り値は（メッセージ, 中断に成功したか）。
//
// [Lv18 バグ仕込み箇所]
// 詠唱の完了をただ待っているだけなので、10秒間固まってしまう。
// select と time.After を使って2秒でタイムアウトし、
// 「詠唱を中断させた！」を返すのが正解。
func InterruptCast() (string, bool) {
	spell := <-castSpell()
	return spell + " が発動してしまった…", false
}
