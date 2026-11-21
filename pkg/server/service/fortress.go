package service

import "fmt"

// FortressStatusURL は砦（host と port）に状態を問い合わせる URL を作る。
//
// [Lv39 バグ仕込み箇所]
// ホストとポートを ":" でそのままつないでいるため、IPv6 アドレス（2001:db8::10）だと
// "http://2001:db8::10:8443/status" になり、どこまでがホストでどこからがポートか分からない。
// Go 1.25 までの net/url は、最後のコロンをポートの区切りとみなして、あいまいなまま読んでいた。
// Go 1.26 からは、角かっこで囲まれていないコロン入りのホストをエラーにするようになった。
// IPv6 アドレスは [2001:db8::10]:8443 のように角かっこで囲む決まり。
// net.JoinHostPort を使うと、必要なときだけ自動で角かっこを付けてくれる。
func FortressStatusURL(host string, port int) string {
	return fmt.Sprintf("http://%s:%d/status", host, port)
}
