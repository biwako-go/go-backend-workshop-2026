# Gopher Slayer - Workshop Tasks

各レベルで「動かないゲームのバグを直す」ことで、GoのAPI開発を体験する。

---

## Lv1：ヒーローが攻撃しても0ダメージ

**症状：** 攻撃ボタンを押しても「You dealt 0 damage!」と表示され、敵のHPが減らない。

**修正箇所：** `pkg/server/model/battle.go`

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

return c.JSON(http.StatusOK, model.ClearStageResponse{...})
```

**やること：** `model.UpdateHeroExperience()` を呼び出す処理を追加する。
参考として、`pkg/server/model/hero.go` の `UpdateHeroName()` を見てみよう。

**完成イメージ：**
```go
// DBに経験値を保存する
if err := model.UpdateHeroExperience(h.db, newExp); err != nil {
    return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update experience"})
}
```

**体験できること：** DBへの書き込み（UPDATE）、Backendの醍醐味

---

## Lv3：ラストステージのボスが強すぎて詰んだ

**症状：** Stage5「Dragon's Lair」のBoss Dragonの攻撃力が50もあり、どうやっても勝てない。
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
       └─ pkg/server/model/hero.go の UpdateHeroHP()
            └─ UPDATE heroes SET hp = ? WHERE id = 1
```

**体験できること：** ルーティング追加、リクエストがDBに届くまでの流れ

---

## Lv4：特定の敵の攻撃がおかしい（Goを触ったことがある人向け）

**症状：** Hell Gateステージの「Demon」と戦うと、
攻撃が来るまで数秒かかり、しかもHPが増えてしまう（ダメージがマイナスになっている）。

**修正箇所：** `pkg/server/model/battle.go` の `EnemyAttack`

```go
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    // ← バグが仕込まれている。コードをよく読んで見つけよう。
    damage := CalculateDamage(req.EnemyAttack)
    return AttackResponse{
        Damage:  damage,
        Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
    }
}
```

**やること：** バグを自分で見つけて修正する。

- ヒント1：なぜ攻撃が遅いのか？
- ヒント2：なぜHPが増えてしまうのか？

**体験できること：** デバッグ力、処理の流れを追う読解力

---

## Lv5：発展課題

クリアしたら好きなものに挑戦しよう。

| カテゴリ | チャレンジ例 |
|---------|------------|
| テスト | Unit Test, Integration Test, E2E Test, TDD, BDD, カバレッジ80% |
| DB | Redis, Index追加, Migration, N+1解消, Transaction |
| アーキテクチャ | クリーンアーキテクチャ, DDD, デザインパターン, DI |
| Go深掘り | Goroutine, context伝播, Graceful Shutdown, pprof, embed |
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
| DB更新の書き方（UPDATE） | `pkg/server/model/hero.go` の `UpdateHeroName()` |
| ハンドラーの書き方 | `pkg/server/handler/hero.go` の `UpdateName()` |
| ルーティングの追加 | `pkg/server/handler/setting.go` |
