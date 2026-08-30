package service

// ChallengeMirage は分身Gopherとの戦い。
// 本体のステータスはそのままに、分身だけを半分の強さにしたい。
// 戻り値は（本体のステータス, 分身のステータス）。
//
// [Lv12 バグ仕込み箇所]
// スライスの代入はコピーではなく「同じ配列を指す別の窓」を作るだけ。
// mirage を弱体化したつもりが、同じ配列を共有している body まで一緒に
// 弱くなってしまっている。slices.Clone（または make + copy）で複製しよう。
func ChallengeMirage() (body, mirage []int) {
	body = []int{50, 30, 20} // 本体の HP / 攻撃 / 防御
	mirage = body            // ← 分身のつもりが同じ配列を見ている
	for i := range mirage {
		mirage[i] = mirage[i] / 2 // 分身は半分の強さにする
	}
	return body, mirage
}
