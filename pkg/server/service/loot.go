package service

// CollectLoot は倒した敵から戦利品を集めて魔法の袋に入れる。
func CollectLoot() map[string]int {
	bag := make(map[string]int)
	items := []string{"薬草", "金貨", "魔石", "金貨", "薬草", "金貨"}
	for _, item := range items {
		bag[item]++ // ← nil map への書き込みで panic！
	}
	return bag
}
