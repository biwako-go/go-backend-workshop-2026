package service

import (
	"fmt"
	"net/http"
	"strconv"
)

// Treasury はギルドの金庫。
type Treasury struct {
	Gold      int      // 残高
	Transfers []string // 送金の記録
}

// NewTreasuryHandler はギルドの金庫の窓口（net/http のハンドラー）を返す。
// 「POST /treasury/transfer」に to（送り先）と amount（金額）を送ると、金庫から送金する。
//
// [Lv38 バグ仕込み箇所]
// どこのサイトから来たリクエストでも、そのまま送金してしまう。
// 悪いサイトに送金フォームを仕込まれると、そのページを開いた冒険者のブラウザから、
// 本人の知らないうちに送金させられる（CSRF: クロスサイト・リクエスト・フォージェリ）。
// Go 1.25 で追加された http.CrossOriginProtection でハンドラーを包むと、ブラウザが付ける
// Sec-Fetch-Site / Origin ヘッダーを見て、別サイトからの POST などを 403 で拒否してくれる。
func NewTreasuryHandler(t *Treasury) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /treasury/transfer", func(w http.ResponseWriter, r *http.Request) {
		amount, err := strconv.Atoi(r.FormValue("amount"))
		if err != nil || amount <= 0 {
			http.Error(w, "金額が正しくない", http.StatusBadRequest)
			return
		}
		to := r.FormValue("to")
		t.Gold -= amount
		t.Transfers = append(t.Transfers, fmt.Sprintf("%s に %dG", to, amount))
		fmt.Fprintf(w, "%s に %dG 送金した", to, amount)
	})
	return mux
}
