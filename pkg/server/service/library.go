package service

import (
	"os"
	"path/filepath"
)

// LendScroll は書庫（libraryDir）から、利用者が名前で指定した巻物を貸し出す（中身を返す）。
//
// [Lv30 バグ仕込み箇所]
// 利用者が指定した名前を filepath.Join でそのままつないで読んでいるため、
//   - "../forbidden/禁呪の書.txt" のように「..」で書庫の外へ抜け出す名前（パストラバーサル）
//   - 書庫の中に仕込まれた「外への抜け道」（シンボリックリンク）
//
// を使われると、書庫の外にある禁書まで貸し出してしまう。
// 名前の文字列チェック（".." を含むか、filepath.IsLocal など）だけでは、抜け道は防げない。
// Go 1.24 の os.Root（os.OpenRoot）を使うと、「このディレクトリの外には一歩も出られない」
// 状態でファイルを開ける。書庫をルートとして開き、その中から巻物を読もう。
func LendScroll(libraryDir, name string) (string, error) {
	data, err := os.ReadFile(filepath.Join(libraryDir, name))
	if err != nil {
		return "", err
	}
	return string(data), nil
}
