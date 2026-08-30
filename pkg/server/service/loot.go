package service

// CollectLoot は倒した敵から戦利品を集めて魔法の袋に入れる。
//
// [Lv8 バグ仕込み箇所]
// var で宣言しただけの map は nil（袋の中身どころか袋そのものがない）。
// nil の map から「読む」のは安全だが、「書き込む」と panic する。
// make(map[string]int) で袋をちゃんと用意してから詰めよう。
func CollectLoot() map[string]int {
	var bag map[string]int
	items := []string{"薬草", "金貨", "魔石", "金貨", "薬草", "金貨"}
	for _, item := range items {
		bag[item]++ // ← nil map への書き込みで panic！
	}
	return bag
}
