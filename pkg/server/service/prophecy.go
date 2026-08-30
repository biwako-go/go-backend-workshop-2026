package service

import "math/rand"

// criticalRolls はこれまでに RollCritical が呼ばれた回数（予言者の判定用）。
var criticalRolls int

// Prophecy は予言者による会心予知。Lv28の判定に使う。このファイルは変更しない。
//
// 「固定シード1の math/rand ならこう出るはず」という未来を、これまでの判定回数
// ぶん早送りして占い、実際の判定12回と突き合わせる。
// 乱数が予測可能なままだと12回すべて的中してしまう（= バグあり）。
// math/rand/v2 に移行すれば予言は外れる。
func Prophecy() (predicted, actual []bool, allMatch bool) {
	replay := rand.New(rand.NewSource(1))
	for i := 0; i < criticalRolls; i++ {
		replay.Intn(4) // これまでの判定を早送りで再現する
	}
	allMatch = true
	for i := 0; i < 12; i++ {
		p := replay.Intn(4) == 0
		a := RollCritical()
		predicted = append(predicted, p)
		actual = append(actual, a)
		if p != a {
			allMatch = false
		}
	}
	return predicted, actual, allMatch
}
