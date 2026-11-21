package service

// Treasure は鑑定済みの宝。
// Bonus は追加ボーナス（EXP）。ボーナスのない宝は nil にして、JSONでは省略する
// （「ボーナス0」と「ボーナスなし」を区別したいので、int ではなく *int にしている）。
type Treasure struct {
	Name  string `json:"name"`
	Bonus *int   `json:"bonus,omitempty"`
}

// treasureVault は鑑定待ちの宝と、その基本価値。この変数は変更しなくてよい。
var treasureVault = []struct {
	name   string
	value  int
	cursed bool // 呪われた宝にはボーナスが付かない
}{
	{"古びた剣", 10, false},
	{"呪いの指輪", 0, true},
	{"竜のうろこ", 30, false},
	{"賢者の石", 50, false},
}

// AppraiseTreasures は宝を鑑定し、ボーナス（基本価値の2倍）を書き込んだ鑑定書を返す。
//
// [Lv34 バグ仕込み箇所]
// &(t.value * 2) のように「式」のアドレスは取れないので、変数 bonus に入れてから &bonus を渡している。
// ところが bonus はループの外で1つだけ宣言した変数なので、どの宝のポインタも「同じ1つの変数」を指す。
// 最後に書き込んだ値（賢者の石のボーナス）が、すべての宝のボーナスに見えてしまう。
// Go 1.26 から、組み込み関数 new に「式」を渡せるようになった。new(式) は
// 「その値で初期化した新しい変数」を作ってポインタを返すので、宝ごとに別のボーナスを持たせられる。
func AppraiseTreasures() []Treasure {
	var appraised []Treasure
	var bonus int
	for _, t := range treasureVault {
		if t.cursed {
			appraised = append(appraised, Treasure{Name: t.name}) // ボーナスなし（nil）
			continue
		}
		bonus = t.value * 2
		appraised = append(appraised, Treasure{Name: t.name, Bonus: &bonus})
	}
	return appraised
}
