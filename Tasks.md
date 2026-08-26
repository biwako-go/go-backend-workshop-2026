# Gopher Slayer - Workshop Tasks

各レベルで「動かないゲームのバグを直す」ことで、GoのAPI開発を体験する。

| 種別 | 説明 |
|------|------|
| **ステージ** | ゲームを進めるために順番にクリアする |
| **タスク** | ステージとは独立して挑戦できる |

---

# ステージ

## Lv1：ヒーローが攻撃しても0ダメージ

**症状：** 攻撃ボタンを押しても「0 ダメージを与えた！」と表示され、敵のHPが減らない。

**修正箇所：** `pkg/server/service/battle.go`

```go
// ダメージを計算する関数
// この関数を完成させてください
func CalculateDamage(attack int) int {
    return 0 // ← ここを修正する
}
```

**やること：** `return 0` を、攻撃力をもとにダメージを返す処理に書き換える。

**完成イメージ：**
```go
func CalculateDamage(attack int) int {
    return attack // attackの値をそのまま返すだけでもOK！
}
```

**体験できること：** 関数の役割・戻り値の理解

---

## Lv2：ステージをクリアしても経験値が増えない

**症状：** ステージをクリアすると「EXP +40」と画面には出るが、リロードするとEXPが0のままになっている。

**修正箇所：** `pkg/server/handler/stage.go` の `ClearStage`

```go
newExp := hero.Experience + expGained

// ← ここにDBへの保存処理が抜けている

return c.JSON(http.StatusOK, service.ClearStageResponse{...})
```

**やること：** `h.heroRepo.UpdateExperience()` を呼び出す処理を追加する。
参考として、`pkg/server/repository/hero.go` の `UpdateName()` を見てみよう。

**完成イメージ：**
```go
// DBに経験値を保存する
if err := h.heroRepo.UpdateExperience(newExp); err != nil {
    return c.JSON(http.StatusInternalServerError, map[string]string{"error": "経験値の更新に失敗しました"})
}
```

**体験できること：** DBへの書き込み（UPDATE）、Backendの醍醐味

---

## Lv3：ラストステージのボスが強すぎて詰んだ

**症状：** 「ドラゴンの巣」ステージの「ボスドラゴン」の攻撃力が50もあり、どうやっても勝てない。
ゲーム画面の「HP編集」ボタンを押すとエラーになる。
`PUT /api/hero/hp` というAPIを呼んでいるが、このエンドポイントが存在しないためだ。

**やること：** ヒーローのHPを編集できるルートを追加する。

### Step 1：ルートを登録する（`pkg/server/handler/setting.go`）

```go
// ヒーロー
api.GET("/hero", hero.GetHero)
api.PUT("/hero/name", hero.UpdateName)
api.PUT("/hero/experience", hero.UpdateExperience)
// ← ここにHP更新のルートを追加する
```

`hero.UpdateHP` はすでに実装済み。以下の1行を追加しよう。

```go
api.PUT("/hero/hp", hero.UpdateHP)
```

### Step 2：動作確認

ルートを追加したら、ゲーム画面の「HP編集」ボタンでHPを増やしてからボス戦に挑もう。

curl でも確認できる：

```bash
curl -X PUT http://localhost:8080/api/hero/hp \
  -H "Content-Type: application/json" \
  -d '{"hp": 500}'
```

### Step 3：コードの流れを追う（理解を深めたい人向け）

```
pkg/server/handler/setting.go（ルーティング）
  └─ pkg/server/handler/hero.go の UpdateHP()
       └─ pkg/server/repository/hero.go の UpdateHP()
            └─ UPDATE heroes SET hp = ? WHERE id = 1
```

**体験できること：** ルーティング追加、リクエストがDBに届くまでの流れ

---

## Lv4：デーモンへの攻撃が反転する（Goを触ったことがある人向け）

**症状：** 「地獄の門」ステージの「デーモン」を攻撃すると、なぜかデーモンのHPが**増える**。

**やること：** バグをコードの中から見つけて修正する。

**修正箇所：** `pkg/server/handler/battle.go` の `Attack`

```go
func (h *BattleHandler) Attack(c echo.Context) error {
    // ← バグが仕込まれている。コードをよく読んで見つけよう。
}
```

**体験できること：** ハンドラー層のデバッグ、処理の流れを追う読解力

---

## Lv5：ボスドラゴンの攻撃だけ遅い（Go経験者向け）

**症状：** 「ドラゴンの巣」ステージの「ボスドラゴン」の攻撃だけ、なぜか遅い。
Lv4 のバグは直したはずなのに…。

**やること：** バグをコードの中から見つけて修正する。

- ヒント：サービス層だけでなく、ハンドラー層も確認してみよう。
- ヒント：リクエストはどのファイルをたどって処理されるか？

**コードの流れ：**

```
pkg/server/handler/setting.go（ルーティング）
  └─ pkg/server/handler/battle.go の EnemyAttack()  ← ここも確認！
       └─ pkg/server/service/battle.go の EnemyAttack()  ← ここも確認！
```

**動作確認（curl）：**

```bash
# 修正前は遅い、修正後はすぐ返ってくる
curl -X POST http://localhost:8080/api/battle/enemy-attack \
  -H "Content-Type: application/json" \
  -d '{"enemy_attack": 50, "enemy_name": "ボスドラゴン", "hero_hp": 100}'
```

**体験できること：** サービス層とハンドラー層をまたいだデバッグ

---

## Lv6：封印を並列に解かないとボスと戦えない（Go経験者向け）

**症状：** 「ドラゴンの巣」に入ろうとすると「封印解除に失敗！修正してから再挑戦しよう。」と表示されてバトルが始まらない。

封印を解く処理が遅すぎて3秒のタイムアウトに引っかかっている。

**やること：** `pkg/server/service/seal.go` の `BreakAllSeals` を goroutine と sync.WaitGroup を使って並列化する。

### ヒント

```go
// 今のコード（順番に解く → 5秒かかる）
for i, seal := range seals {
    time.Sleep(1 * time.Second)
    results[i] = seal + "を解いた！"
}

// 並列にすると約1秒で完了する
var wg sync.WaitGroup
for i, seal := range seals {
    wg.Add(1)
    go func(i int, seal string) {
        defer wg.Done()
        // ...
    }(i, seal)
}
wg.Wait()
```

**動作確認（curl）：**

```bash
# 修正後は1秒以内に200 OKが返ってくる
curl -X POST http://localhost:8080/api/stages/5/challenge
```

**体験できること：** goroutine、sync.WaitGroup、並列処理による高速化

---

# タスク

## Lv7：テストを書いてバグを見つける（Go経験者向け）

**症状：** ボスドラゴンの攻撃を受けてHPが0になるはずなのに、なぜか1残って死なない。

**やること：** `pkg/server/service/battle_test.go` にテストケースを追加してバグを見つけ、修正する。

### Step 1：テストを書く

`pkg/server/service/battle_test.go` にテストケースを追加しよう。

```go
tests := []struct {
    name      string
    currentHP int
    damage    int
    want      int
}{
    {"通常のダメージ", 100, 30, 70},
    // ← ここにケースを追加してバグを見つけよう
}
```

### Step 2：テストを実行する

```bash
go test ./pkg/server/service/ -run TestApplyDamage -v
```

テストが失敗したら、失敗したケースのヒントをもとにバグを探そう。

### Step 3：バグを修正する

**修正箇所：** `pkg/server/service/battle.go` の `ApplyDamage`

**体験できること：** テーブル駆動テスト、`go test` の使い方、テストでバグを発見する体験

---

# 発展課題

クリアしたら好きなものに挑戦しよう。

| カテゴリ | チャレンジ例 |
|---------|------------|
| テスト | Integration Test, E2E Test, TDD, BDD, カバレッジ80% |
| DB | Redis, Index追加, Migration, N+1解消, Transaction |
| アーキテクチャ | クリーンアーキテクチャ, DDD, デザインパターン, DI |
| Go深掘り | context伝播, Graceful Shutdown, pprof, embed |
| API品質 | バリデーション, 認証(JWT), Rate Limiting, 構造化ログ, エラーハンドリング統一 |
| 可観測性 | メトリクス(Prometheus), 分散トレーシング(OpenTelemetry), slog |
| 新機能 | ガチャ機能, 武器システム, gRPC, GraphQL |
| 開発環境 | CI/CD(GitHub Actions), Linter(golangci-lint), Docker最適化 |
| ドキュメント | ADR作成, アーキテクチャ図(Mermaid), 開発ガイド |

詳細は [CHALLENGES.md](CHALLENGES.md) を参照。

---

## 参考：実装済みの例

迷ったときは以下の既存コードを参考にしよう。

| 参考にできる実装 | ファイル |
|----------------|---------|
| DB更新の書き方（UPDATE） | `pkg/server/repository/hero.go` の `UpdateName()` |
| ハンドラーの書き方 | `pkg/server/handler/hero.go` の `UpdateName()` |
| ルーティングの追加 | `pkg/server/handler/setting.go` |
