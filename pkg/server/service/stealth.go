package service

// ScoutedEnemy は偵察で得た敵の情報。
type ScoutedEnemy struct {
	Name   string `json:"name"`
	Hp     int    `json:"hp"`
	Attack int    `json:"attack"`
}

// ScoutEnemy はステルスGopherを偵察して情報を持ち帰る。
func ScoutEnemy() ScoutedEnemy {
	return ScoutedEnemy{Name: "ステルスGopher", Hp: 55, Attack: 13}
}
