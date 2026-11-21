package service

import "strings"

// ReadDecree は王の勅書を「本文」と「署名」に分ける。
// 勅書は「本文--署名」の形で、署名は最後の「--」の後ろに書かれる。本文の中にも「--」が出てくることがある。
// 戻り値は（本文, 署名, 区切りが見つかったか）。
//
// [Lv41 バグ仕込み箇所]
// strings.Cut は「最初の」区切りで切るので、本文に「--」を含む勅書だと、本文の途中から後ろを
// まるごと署名だと思ってしまう（本物の王の勅書なのに、署名が違うので偽物と判定される）。
// Go 1.27 で追加された strings.CutLast は、「最後の」区切りで切ってくれる。
func ReadDecree(decree string) (body, signer string, found bool) {
	return strings.Cut(decree, "--")
}
