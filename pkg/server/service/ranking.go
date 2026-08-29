package service

import "strings"

// SortEnemiesByAttack は敵を攻撃力の高い順に並べ替える。
//
// [Lv22 バグ仕込み箇所（リファクタ対象）]
// 手書きのバブルソートで書かれている。
// Go 1.21 標準の slices.SortFunc（比較には cmp.Compare が使える）に置き換えよう。
func SortEnemiesByAttack(enemies []*Enemy) {
	for i := 0; i < len(enemies); i++ {
		for j := 0; j < len(enemies)-1-i; j++ {
			if enemies[j].Attack < enemies[j+1].Attack {
				enemies[j], enemies[j+1] = enemies[j+1], enemies[j]
			}
		}
	}
}

// HasBoss は敵の中に「ボス」と名の付く敵がいるかを調べる。
//
// [Lv22 バグ仕込み箇所（リファクタ対象）]
// こちらも手書きループ。slices.ContainsFunc に置き換えよう。
func HasBoss(enemies []*Enemy) bool {
	for _, e := range enemies {
		if strings.Contains(e.Name, "ボス") {
			return true
		}
	}
	return false
}
