package service

// Potion は回復薬。Heal だけHPが回復する。
type Potion struct {
	Heal int
}

// Bomb は爆弾。飲み物ではない。
type Bomb struct {
	Damage int
}

// Satchel は冒険の道具袋。いろいろな型の道具を、名前を付けて出し入れできる（中身は any）。
type Satchel struct {
	items map[string]any
}

// NewSatchel は空の道具袋を作る。
func NewSatchel() *Satchel {
	return &Satchel{items: map[string]any{}}
}

// Put は道具に名前を付けて袋に入れる。
func (s *Satchel) Put(name string, item any) {
	s.items[name] = item
}

// Take は道具を名前で取り出す。
// Go 1.26 まではメソッドに型パラメータを付けられなかったので、何でも入る any で返している。
// 使う側は .(Potion) のように型アサーションしなければならない。
func (s *Satchel) Take(name string) any {
	return s.items[name]
}

// DrinkPotions は袋の中の道具を順に確かめ、回復薬だけを飲んで、回復した合計を返す。
//
// [Lv42 バグ仕込み箇所]
// 取り出した道具を .(Potion) と決め打ちしているが、袋には爆弾も紛れ込んでいる。
// 型アサーションが外れると panic する（袋の中で爆弾が爆発！）。
// Go 1.27 から、メソッドにも型パラメータを付けられる（ジェネリックメソッド）。
// Take を「型を指定して取り出し、違う型なら ok=false を返す」メソッドに作り変えれば、
// 呼び出し側は s.Take[Potion](name) と書くだけで、回復薬だけを安全に選び出せる。
func DrinkPotions(s *Satchel, names []string) int {
	healed := 0
	for _, name := range names {
		p := s.Take(name).(Potion)
		healed += p.Heal
	}
	return healed
}
