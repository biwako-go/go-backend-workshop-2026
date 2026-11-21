package service

import "fmt"

// BarrierError は「結界に呪文を弾かれた」ことを表すエラー。結界の弱点（属性）を教えてくれる。
type BarrierError struct {
	Barrier  string // 結界の名前
	Weakness string // 弱点の属性
}

func (e *BarrierError) Error() string {
	return fmt.Sprintf("%sに弾かれた（弱点: %s）", e.Barrier, e.Weakness)
}

// BarrierResult は結界1層ぶんの攻防の結果。
type BarrierResult struct {
	Barrier  string `json:"barrier"`  // 結界の名前
	Weakness string `json:"weakness"` // 見抜いた弱点（見抜けなければ空）
	Broken   bool   `json:"broken"`   // 結界を破れたか
}

// barrierLayers は結界術師Gopherが張った3層の結界と、それぞれの弱点。この変数は変更しなくてよい。
var barrierLayers = []struct {
	name     string
	weakness string
}{
	{"氷の結界", "炎"},
	{"炎の結界", "水"},
	{"闇の結界", "光"},
}

// strikeBarrier は layer 層目の結界に element 属性の呪文を放つ。
// 弱点の属性なら結界は砕けて nil、それ以外は弾かれてエラーを返す。
// どの層で弾かれたかが分かるよう、BarrierError を fmt.Errorf の %w で包んで（ラップして）返す。
// この関数は変更しなくてよい。
func strikeBarrier(layer int, element string) error {
	b := barrierLayers[layer]
	if element == b.weakness {
		return nil // 弱点を突いた！結界は砕ける
	}
	return fmt.Errorf("第%d層で%s属性の呪文が弾かれた: %w", layer+1, element, &BarrierError{Barrier: b.name, Weakness: b.weakness})
}

// BreakBarriers は3層の結界を順に破る。まず無属性の呪文で様子を見て、弾かれたら
// エラーから弱点を読み取り、その属性で放ち直す。
//
// [Lv32 バグ仕込み箇所]
// err.(*BarrierError) の型アサーションは「err そのもの」が *BarrierError のときしか成功しない。
// strikeBarrier は BarrierError を %w で包んで返すので、見えているのは外側の包み紙だけ。
// 弱点が書かれた中身まで手が届かず、結界を1枚も破れない。
// Go 1.26 で追加された errors.AsType を使うと、包みを1枚ずつ開けて目的の型のエラーを探し出せる。
func BreakBarriers() []BarrierResult {
	var results []BarrierResult
	for layer, b := range barrierLayers {
		result := BarrierResult{Barrier: b.name}
		err := strikeBarrier(layer, "無") // まずは無属性の呪文で様子見
		if be, ok := err.(*BarrierError); ok {
			result.Weakness = be.Weakness
			err = strikeBarrier(layer, be.Weakness) // 弱点の属性で放ち直す
		}
		result.Broken = err == nil
		results = append(results, result)
	}
	return results
}
