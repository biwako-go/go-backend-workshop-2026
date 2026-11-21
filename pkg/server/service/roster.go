package service

import (
	"fmt"
	"time"
)

// IssueAdventurerID は冒険者ギルドの登録番号を1つ発行する。
//
// [Lv35 バグ仕込み箇所]
// 登録した時刻（ミリ秒）をそのまま登録番号にしているため、同じミリ秒の間に登録した冒険者には
// 同じ番号が振られてしまう。なりすましGopherはこれを悪用して、他人の番号を名乗ってくる。
// Go 1.27 で、標準ライブラリに uuid パッケージが入った（import "uuid"）。
// uuid.NewV7() が作る UUIDv7 は先頭に時刻が入っているので、「発行順に並ぶ」性質を保ったまま重複しない。
// （uuid.New() が作る v4 は完全なランダムなので、重複はしないが発行順には並ばない）
func IssueAdventurerID() string {
	return fmt.Sprintf("ADV-%d", time.Now().UnixMilli())
}

// RegisterAdventurers は n 人の冒険者を続けて登録し、発行した登録番号を登録順に返す。
// この関数は変更しなくてよい。
func RegisterAdventurers(n int) []string {
	ids := make([]string, 0, n)
	for range n {
		ids = append(ids, IssueAdventurerID())
	}
	return ids
}
