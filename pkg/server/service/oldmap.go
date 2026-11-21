package service

import (
	"io"
	"os"
	"path/filepath"
)

// ReadTreasureMap は地図庫（mapDir）から宝の地図を1枚読み、「地図の名前：中身」を返す。
//
// [Lv37 バグ仕込み箇所]
// os.Open のエラーを確かめる前に、開いたファイル f を使っている（f.Name()）。
// 地図が見つからないとき f は nil なので、nil ポインタの参照で panic する。
// Go 1.21〜1.24 のコンパイラには、この nil チェックを後回しにしてしまうバグがあり、
// 先にエラーで return して「たまたま動いているように見える」ことがあった。
// Go 1.25 でそのバグが直り、こういうコードは正しく panic するようになった。
// 結果を使う前に、まず err を確かめよう。
func ReadTreasureMap(mapDir, name string) (string, error) {
	f, err := os.Open(filepath.Join(mapDir, name))
	title := f.Name()
	if err != nil {
		return "", err
	}
	defer f.Close()
	body, err := io.ReadAll(f)
	if err != nil {
		return "", err
	}
	return filepath.Base(title) + "：" + string(body), nil
}
