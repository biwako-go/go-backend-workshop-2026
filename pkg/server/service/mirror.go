package service

// MirrorKnight は鏡の鎧のGopher。
type MirrorKnight struct {
	HP int `json:"hp"`
}

// TakeDamage は騎士にダメージを与える。
//
// [Lv7 バグ仕込み箇所]
// レシーバが「値レシーバ」なので、メソッドが受け取るのは本体のコピー。
// コピーのHPを減らしても本体には反映されない（攻撃が鏡に吸われている！）。
// ポインタレシーバ func (k *MirrorKnight) TakeDamage(...) に変えよう。
func (k MirrorKnight) TakeDamage(damage int) {
	k.HP -= damage
}

// ChallengeMirrorKnight は騎士に30ダメージ×3回の攻撃を加え、
// 攻撃前と攻撃後のHPを返す。この関数は変更しなくてよい。
func ChallengeMirrorKnight() (before, after int) {
	knight := &MirrorKnight{HP: 90}
	before = knight.HP
	for i := 0; i < 3; i++ {
		knight.TakeDamage(30)
	}
	return before, knight.HP
}
