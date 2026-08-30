package service

// ScoutedEnemy は偵察で得た敵の情報。
//
// [Lv6 バグ仕込み箇所]
// Goでは「大文字で始まる名前」だけがパッケージの外から見える（公開される）。
// フィールドが小文字（非公開）だと encoding/json からも見えず、
// JSONに変換すると空っぽ {} になってしまう。
// フィールド名を大文字にして、jsonタグ（`json:"name"` など）を付けよう。
type ScoutedEnemy struct {
	name   string
	hp     int
	attack int
}

// ScoutEnemy はステルスGopherを偵察して情報を持ち帰る。
func ScoutEnemy() ScoutedEnemy {
	return ScoutedEnemy{name: "ステルスGopher", hp: 55, attack: 13}
}
