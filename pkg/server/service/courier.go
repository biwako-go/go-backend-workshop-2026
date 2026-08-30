package service

import (
	"io"
	"net/http"
)

// SendCourier は遠方のギルドへ伝令を送り、返事を待って持ち帰る。
//
// [Lv20 バグ仕込み箇所]
// http.Client にタイムアウトを設定していないため、相手のギルドが
// 眠っている（応答しない）と伝令は永遠に待ち続けてしまう。
// Timeout: 2 * time.Second を設定して、2秒で見切りをつけて帰らせよう。
// （タイムアウト時は client.Get がエラーを返す）
func SendCourier(url string) (string, error) {
	client := &http.Client{} // ← Timeout 未設定
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(body), nil
}
