package service

import "time"

// investigate は依頼を1件調査する。1秒かかる。この関数は変更しなくてよい。
func investigate(name string) (string, error) {
	time.Sleep(1 * time.Second)
	return name + "、完了！", nil
}

// GatherQuestReports はギルドの3つの依頼を調査して報告書を集める。
//
// [Lv16 バグ仕込み箇所]
// 依頼を1件ずつ順番に調査しているため3秒かかり、ギルドの受付時間（2秒）に
// 間に合わない。golang.org/x/sync/errgroup で並列化しよう。
// （どれか1件でも失敗したら全体をエラーにできるのが sync.WaitGroup との違い）
//
//	go get golang.org/x/sync/errgroup
func GatherQuestReports() ([]string, error) {
	quests := []string{"魔物の生息調査", "薬草の在庫確認", "地図の作成"}
	reports := make([]string, len(quests))
	for i, quest := range quests {
		report, err := investigate(quest)
		if err != nil {
			return nil, err
		}
		reports[i] = report
	}
	return reports, nil
}
