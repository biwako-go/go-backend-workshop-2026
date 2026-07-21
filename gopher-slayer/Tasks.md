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

## Lv3：Castleの敵が強すぎて一撃でほぼ死ぬ

**症状：** Castle ステージの Dark Knight の攻撃力が異常に高く、1発食らうとほぼ死んでしまう。
MaxHP まで回復してから再挑戦したいが、ゲーム画面の「HP回復」ボタンを押しても何も起きない。
`PUT /api/hero/hp` というAPIを呼んでいるが、このエンドポイントが存在しないためだ。

**やること：** HP更新APIをゼロから実装する。

### コードの流れ

```
pkg/server/handler/setting.go（ルーティング）
  └─ pkg/server/handler/hero.go の UpdateHP()        ← 実装が必要
       └─ pkg/server/model/hero.go の UpdateHeroHP()  ← 実装が必要
            └─ UPDATE heroes SET hp = ? WHERE id = 1
```

### Step 1：DBを更新する関数を書く（`pkg/server/model/hero.go`）

`UpdateHeroHP` にスタブが用意されている。`UpdateHeroName` を参考に実装しよう。

```go
// 参考：UpdateHeroName の実装
func UpdateHeroName(db *sql.DB, name string) error {
    _, err := db.Exec(`UPDATE heroes SET name = ? WHERE id = 1`, name)
    return err
}
```

### Step 2：ハンドラーを書く（`pkg/server/handler/hero.go`）

`UpdateHP` にスタブが用意されている。`UpdateName` を参考に実装しよう。

```go
// 参考：UpdateName の実装
func (h *HeroHandler) UpdateName(c echo.Context) error {
    var req model.UpdateNameRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
    }
    if err := model.UpdateHeroName(h.db, req.Name); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    return c.JSON(http.StatusOK, map[string]string{"message": "Name updated successfully"})
}
```

HPの更新に使うリクエスト型は `model.UpdateHPRequest`（フィールドは `HP int`）。

### Step 3：ルートを登録する（`pkg/server/handler/setting.go`）

`UpdateHP` の実装が完成したら、コメントアウトされている行を有効にしよう。

```go
api.PUT("/hero/hp", hero.UpdateHP)
```

### Step 4：動作確認

ゲーム画面の「HP編集」ボタンでHPを増やしてからボス戦に挑もう。

curl でも確認できる：

```bash
curl -X PUT http://localhost:8080/api/hero/hp \
  -H "Content-Type: application/json" \
  -d '{"hp": 500}'
```

**体験できること：** DB操作・ハンドラー・ルーティングをゼロから実装する、リクエストがDBに届くまでの流れ

---

## Lv4：特定の敵の攻撃がおかしい（Goを触ったことがある人向け）

**症状：** Hell Gateステージの「Demon」と戦うと、攻撃が来るまで数秒かかる。

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

- ヒント：なぜ攻撃が遅いのか？

**体験できること：** デバッグ力、処理の流れを追う読解力

---

## Lv5：テストを書いてバグを見つける（Goを触ったことがある人向け）

**症状：** Hell Gate までクリアして経験値が300を超えているのに、Dragon's Lair が解放されない。

Dragon's Lair は Lv2 以上でないと解放されない仕様だが、どれだけ経験値を稼いでもヒーローのレベルが上がっていないようだ。

**やること：** `pkg/server/model/battle_test.go` にテストケースを追加して、レベル計算のバグを発見し修正する。

### Step 1：テストを実行してみる

```bash
go test ./pkg/server/model/... -v
```

今は既存のケース（experience が 100 未満）しかないので、全部 PASS する。

### Step 2：テストケースを追加する

`battle_test.go` を開いて、100以上のケースを追加してみよう。

```go
{"Lv2の開始", 100, 2},   // experience が 100 のとき Lv2 になるはず
{"Lv2の上限", 299, 2},
{"Lv3の開始", 300, 3},
{"Lv4の開始", 600, 4},
```

### Step 3：テストを再実行してバグを確認する

```bash
go test ./pkg/server/model/... -v
# --- FAIL: TestCalcLevel/Lv2の開始 (0.00s)
#     CalcLevel(100) = 1, want 2  ← バグ発見！
```

### Step 4：`battle.go` の `CalcLevel` を見てバグを修正する

- ヒント：100以上のケースが実装されていない

### Step 5：テストがすべて通ることを確認する

```bash
go test ./pkg/server/model/... -v
# --- PASS: TestCalcLevel (0.00s)
```

### Step 6：ゲームを確認する

Hell Gate をクリアすると Dragon's Lair が解放されるはず。

**体験できること：** テーブル駆動テスト、`go test` の使い方、テストによるバグ発見

---

## Lv6：封印を同時に解かないとボスが倒せない（goroutineに挑戦）

**症状：** Dragon's Lair のボスには3つの封印が施されている。
封印を解く API `POST /api/battle/seals` を呼ぶと「封印を解くのが遅すぎた！」と返ってきてしまう。

**原因：** 封印を順番に解いているため3秒かかってしまい、2秒の制限を超えている。

**修正箇所：** `pkg/server/model/battle.go` の `BreakSeals`

```go
// バグ: 順番に処理しているため遅い
for i, atk := range req.Attacks {
    time.Sleep(1 * time.Second)
    damages[i] = CalculateDamage(atk)
}
_ = sync.WaitGroup{} // ヒント: sync.WaitGroup を使おう
```

**やること：** goroutine を使って封印を並列に解く。

### ヒント

```go
var wg sync.WaitGroup
for i, atk := range req.Attacks {
    wg.Add(1)
    go func(i, atk int) {
        defer wg.Done() // goroutineが終わったらDone()を呼ぶ
        // ここに処理を書く
    }(i, atk)
}
wg.Wait() // 全goroutineが終わるまで待つ
```

### 動作確認

```bash
curl -X POST http://localhost:8080/api/battle/seals \
  -H "Content-Type: application/json" \
  -d '{"attacks": [50, 30, 40]}'
# 修正前: {"success":false,"message":"封印を解くのが遅すぎた！..."}
# 修正後: {"success":true,"message":"全ての封印を同時に解いた！ボスを倒せ！",...}
```

**体験できること：** goroutine、sync.WaitGroup、`defer wg.Done()` のイディオム、並列処理で速くなる体験

---

## Lv7：発展課題

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
