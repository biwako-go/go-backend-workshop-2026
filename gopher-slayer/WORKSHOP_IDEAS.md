# ワークショップ拡張アイデア

## ミニゲーム案：封印解除チャレンジ（goroutine + defer + WaitGroup）

### コンセプト
ボスが複数の封印で守られていて、**全部同時に**解かないとボスのHPが回復してしまう。
goroutineを使わないと時間制限でゲームオーバー。

### ゲームの流れ
1. フロントに「封印解除」画面を用意（最初から実装済み）
2. 参加者は `POST /api/battle/seals` エンドポイントを自分で実装する
3. 順番に処理すると3秒かかってタイムオーバー → 失敗
4. goroutineで並列化すると1秒で完了 → 成功

### 実装のポイント
- バグ版：for loopで順番に `breakSeal()` を呼ぶ
- 正解版：goroutine + `sync.WaitGroup` + `defer wg.Done()`
- サーバー側で `time.Since(start)` を計測して閾値（1.5秒）を超えたら失敗

### Goで学べること
- goroutine の基本
- sync.WaitGroup の使い方
- `defer wg.Done()` のイディオム

---

## 他のアイデア（未整理）

- context.WithTimeout でDBクエリにタイムアウトをつける
- channel でバトルログをリアルタイム受け取る
- error wrapping で `fmt.Errorf("%w", err)`
- interface でバトル戦略を差し替え可能にする
