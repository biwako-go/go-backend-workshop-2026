# Gopher Slayer — 答え合わせ

各レベルの修正箇所と完成コードをまとめています（講師向け）。

## 目次

| Lv | 種別 | タイトル | テーマ |
|----|------|---------|--------|
| [Lv1](#lv1ヒーローが攻撃しても0ダメージ) | ステージ | ヒーローが攻撃しても0ダメージ | 関数の戻り値 |
| [Lv2](#lv2ステージをクリアしても経験値が増えない) | ステージ | 経験値が増えない | DBへのUPDATE |
| [Lv3](#lv3hp編集ボタンを押すと404になる) | ステージ | HP編集が404 | ルーティング追加 |
| [Lv4](#lv4デーモンへの攻撃が反転する) | ステージ | デーモンへの攻撃が反転 | ハンドラーのデバッグ |
| [Lv5](#lv5ボスドラゴンの攻撃だけ遅い) | ステージ | ボスの攻撃だけ遅い | 2層またぎのデバッグ |
| [Lv6](#lv6-ステージ封印を並列に解かないとボスと戦えない) | ステージ | 封印の並列解除 | goroutine + WaitGroup |
| [Lv7](#lv7-タスクテストを書いてバグを見つける) | タスク | テストでバグ発見 | テーブル駆動テスト |
| [Lv8](#lv8-ステージゴブリンの群れを一掃せよ) | ステージ | 群れ討伐の数がズレる | Race Condition / Mutex |
| [Lv9](#lv9-ステージ倒した敵の怨念を祓え) | ステージ | メモリが増え続ける | GC / メモリリーク |
| [Lv10](#lv10-ステージ幻のステージの番人) | ステージ | 存在しないステージでpanic | nil / エラー握りつぶし |
| [Lv11](#lv11-ステージボスの詠唱を中断せよ) | ステージ | 詠唱中断が固まる | select / time.After |
| [Lv12](#lv12-タスク戦場からの安全な撤退) | タスク | Ctrl+Cで即死 | Graceful Shutdown |
| [Lv13](#lv13-タスク戦闘レポートを高速化せよ) | タスク | レポート生成が遅い | bench / strings.Builder |
| [Lv14](#lv14-タスク冒険の記録を整えよ) | タスク | ログが検索できない | log/slog |
| [Lv15](#lv15-タスク時空の歪みを断ち切れ) | タスク | キャンセルが伝わらない | context伝播 |
| [Lv16](#lv16-ステージギルドの依頼を同時にこなせ) | ステージ | 依頼調査が間に合わない | errgroup |
| [Lv17](#lv17-ステージ悪霊の門を閉じろ) | ステージ | goroutineが増え続ける | goroutineリーク |
| [Lv18](#lv18-ステージ呪いの爆弾を解除せよ) | ステージ | サーバーごと落ちる | goroutine内panic / recover |
| [Lv19](#lv19-タスク古文書の解読は一度だけ) | タスク | 毎回800ms待たされる | sync.Once |
| [Lv20](#lv20-タスククリティカルの乱数を現代化せよ) | タスク | 乱数が予測可能 | math/rand/v2 |
| [Lv21](#lv21-タスク二つの関数を一つに束ねよ) | タスク | 重複関数の統合 | ジェネリクス |
| [Lv22](#lv22-タスク手書きループを標準の剣で斬れ) | タスク | 車輪の再発明 | slicesパッケージ |
| [Lv23](#lv23-タスク時間停止の魔法でテストせよ) | タスク | 時間依存テストが遅い | testing/synctest |
| [Lv24](#lv24-タスク酒場の席数を最適化せよ) | タスク | DB接続が無制限 | コネクションプール |
| [Lv25](#lv25-タスク伝説の単一バイナリ) | タスク | バイナリ単体で動かない | go:embed |

---

## Lv1：ヒーローが攻撃しても0ダメージ

**修正ファイル：** `pkg/server/service/battle.go`

```go
// 修正前
func CalculateDamage(attack int) int {
    return 0
}

// 修正後（attackをそのまま返すだけでOK）
func CalculateDamage(attack int) int {
    return attack
}
```

---

## Lv2：ステージをクリアしても経験値が増えない

**修正ファイル：** `pkg/server/handler/stage.go` の `ClearStage`

```go
newExp := hero.Experience + expGained

// ↓ この3行が抜けているのが原因
if err := h.heroRepo.UpdateExperience(newExp); err != nil {
    return c.JSON(http.StatusInternalServerError, map[string]string{"error": "経験値の更新に失敗しました"})
}
```

---

## Lv3：HP編集ボタンを押すと404になる

**修正ファイル：** `pkg/server/handler/setting.go`

```go
// ヒーロー
api.GET("/hero", hero.GetHero)
api.PUT("/hero/name", hero.UpdateName)
api.PUT("/hero/experience", hero.UpdateExperience)
api.PUT("/hero/hp", hero.UpdateHP)  // ← この行が抜けている
```

---

## Lv4：デーモンへの攻撃が反転する

**修正ファイル：** `pkg/server/handler/battle.go` の `Attack`

```go
// バグ版
func (h *BattleHandler) Attack(c echo.Context) error {
    ...
    result := service.HeroAttack(req)
    // [Lv4 バグ仕込み箇所]
    if req.EnemyName == "デーモン" {
        result.Damage = -result.Damage          // ← バグ: ダメージを反転
        result.Message = "攻撃が吸収された！" + result.Message
    }
    return c.JSON(http.StatusOK, result)
}

// 修正後（if ブロックを丸ごと削除）
func (h *BattleHandler) Attack(c echo.Context) error {
    ...
    result := service.HeroAttack(req)
    return c.JSON(http.StatusOK, result)
}
```

---

## Lv5：ボスドラゴンの攻撃だけ遅い

バグが **2箇所** あります。両方直す必要があります。

### 修正1: `pkg/server/service/battle.go` の `EnemyAttack`

```go
// バグ版
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    damage := CalculateEnemyDamage(req.EnemyAttack)
    if req.EnemyName == "ボスドラゴン" {
        time.Sleep(3 * time.Second)  // ← バグ: 削除する
    }
    ...
}

// 修正後
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    damage := CalculateEnemyDamage(req.EnemyAttack)
    newHeroHP := ApplyDamage(req.HeroHP, damage)
    return AttackResponse{
        Damage:    damage,
        NewHeroHP: newHeroHP,
        Message:   fmt.Sprintf("%s が %d ダメージを与えた！", req.EnemyName, damage),
    }
}
```

### 修正2: `pkg/server/handler/battle.go` の `EnemyAttack`

```go
// バグ版
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
    ...
    if req.EnemyName == "ボスドラゴン" {
        time.Sleep(5 * time.Second)  // ← バグ: 削除する
    }
    result := service.EnemyAttack(req)
    return c.JSON(http.StatusOK, result)
}

// 修正後（if ブロックを丸ごと削除）
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
    ...
    result := service.EnemyAttack(req)
    return c.JSON(http.StatusOK, result)
}
```

---

## Lv6 [ステージ]：封印を並列に解かないとボスと戦えない

**修正ファイル：** `pkg/server/service/seal.go` の `BreakAllSeals`

```go
// 修正後
func BreakAllSeals() []string {
    seals := []string{"炎の封印", "水の封印", "風の封印", "大地の封印", "闇の封印"}
    results := make([]string, len(seals))
    var wg sync.WaitGroup
    for i, seal := range seals {
        wg.Add(1)
        go func(i int, seal string) {
            defer wg.Done()
            time.Sleep(1 * time.Second)
            results[i] = seal + "を解いた！"
        }(i, seal)
    }
    wg.Wait()
    return results
}
```

import に `"sync"` を追加するのを忘れずに。

---

## Lv7 [タスク]：テストを書いてバグを見つける

**テストケース例：**

```go
tests := []struct {
    name      string
    currentHP int
    damage    int
    want      int
}{
    {"通常のダメージ", 100, 30, 70},
    {"ちょうど0になるダメージ", 100, 100, 0},
    {"致死ダメージ", 10, 20, 0},  // ← このケースで失敗する
}
```

**修正ファイル：** `pkg/server/service/battle.go` の `ApplyDamage`

```go
// 修正前
func ApplyDamage(currentHP, damage int) int {
    if currentHP-damage < 0 {
        return 1  // ← バグ: 0 にすべき
    }
    return currentHP - damage
}

// 修正後
func ApplyDamage(currentHP, damage int) int {
    if currentHP-damage < 0 {
        return 0
    }
    return currentHP - damage
}
```

---

## Lv8 [ステージ]：ゴブリンの群れを一掃せよ

**修正ファイル：** `pkg/server/service/horde.go` の `SlayHorde`

`go test -race ./...` でデータ競合を検出できる。

```go
// 修正後（sync.Mutex でカウンタを守る）
func SlayHorde(total int) HordeResponse {
    killCount = 0
    var mu sync.Mutex
    var wg sync.WaitGroup
    for i := 0; i < total; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            time.Sleep(time.Microsecond) // 討伐の一瞬のスキ
            mu.Lock()
            killCount++
            mu.Unlock()
        }()
    }
    wg.Wait()
    // ...メッセージ組み立ては変更なし
}
```

`sync/atomic` を使う場合は `var killCount int64` にして `atomic.AddInt64(&killCount, 1)` でもよい。

---

## Lv9 [ステージ]：倒した敵の怨念を祓え

**修正ファイル：** `pkg/server/service/battle.go`

```go
// バグ版
var grudges [][]byte

func HeroAttack(req AttackRequest) AttackResponse {
    damage := CalculateDamage(req.HeroAttack)
    grudges = append(grudges, make([]byte, 5*1024*1024)) // ← バグ
    ...
}

// 修正後（グローバル変数 grudges と append の行を丸ごと削除）
func HeroAttack(req AttackRequest) AttackResponse {
    damage := CalculateDamage(req.HeroAttack)
    return AttackResponse{
        Damage:  damage,
        Message: fmt.Sprintf("%d ダメージを与えた！", damage),
    }
}
```

修正後は**サーバーの再起動が必要**（溜まった怨念＝ヒープ上の参照は再起動でしか消えない）。

観測コマンド：

```bash
curl http://localhost:8080/api/debug/memory
GODEBUG=gctrace=1 make dev
```

ポイント：GC は「どこからも参照されていないメモリ」しか回収できない。グローバル変数に参照が残っている限りリークし続ける。

---

## Lv10 [ステージ]：幻のステージの番人

**修正ファイル：** `pkg/server/repository/stage.go` の `GetByID`

```go
// バグ版
err := row.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum)
if err != nil {
    return nil, nil // ← エラーを握りつぶしている
}

// 修正後
err := row.Scan(&s.ID, &s.Name, &s.Description, &s.RequiredExperience, &s.OrderNum)
if err != nil {
    return nil, err
}
```

`nil, nil` を返すと呼び出し側（`ClearStage`）の `err != nil` チェックを素通りし、`stage.Name` の参照で nil ポインタ panic になる。

**発展の解答例（handler で 404 を返す）：**

```go
stage, err := h.stageRepo.GetByID(id)
if errors.Is(err, sql.ErrNoRows) {
    return c.JSON(http.StatusNotFound, map[string]string{"error": "ステージが見つかりません"})
}
if err != nil {
    return c.JSON(http.StatusInternalServerError, map[string]string{"error": "ステージの取得に失敗しました"})
}
```

---

## Lv11 [ステージ]：ボスの詠唱を中断せよ

**修正ファイル：** `pkg/server/service/spell.go` の `InterruptCast`

```go
// バグ版
func InterruptCast() (string, bool) {
    spell := <-castSpell() // ← 10秒間ただ待つだけ
    return spell + " が発動してしまった…", false
}

// 修正後
func InterruptCast() (string, bool) {
    select {
    case spell := <-castSpell():
        return spell + " が発動してしまった…", false
    case <-time.After(2 * time.Second):
        return "詠唱を中断させた！", true
    }
}
```

---

## Lv12 [タスク]：戦場からの安全な撤退

**修正ファイル：** `cmd/main.go`

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/maropook/gopher-slayer/pkg/constant"
    appdb "github.com/maropook/gopher-slayer/pkg/db"
    "github.com/maropook/gopher-slayer/pkg/server"
)

func main() {
    cfg := constant.Load()
    db := appdb.Connect(cfg)
    defer db.Close()

    e := server.New(db)

    // 別goroutineでサーバーを起動する
    go func() {
        log.Printf("Server starting on :%s", cfg.Port)
        if err := e.Start(":" + cfg.Port); err != nil && err != http.ErrServerClosed {
            e.Logger.Fatal(err)
        }
    }()

    // Ctrl+C（SIGINT）/ SIGTERM を待つ
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    // 10秒以内に進行中のリクエストを処理してから終了する
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := e.Shutdown(ctx); err != nil {
        e.Logger.Fatal(err)
    }
}
```

---

## Lv13 [タスク]：戦闘レポートを高速化せよ

**修正ファイル：** `pkg/server/service/battle.go` の `BuildBattleReport`

```go
// 修正前（+= 連結は毎回新しい文字列を作るので遅い）
func BuildBattleReport(logs []string) string {
    report := ""
    for _, log := range logs {
        report += log + "\n"
    }
    return report
}

// 修正後
func BuildBattleReport(logs []string) string {
    var b strings.Builder
    for _, log := range logs {
        b.WriteString(log)
        b.WriteString("\n")
    }
    return b.String()
}
```

import に `"strings"` を追加する。計測コマンド：

```bash
go test ./pkg/server/service/ -bench BuildBattleReport -benchmem
```

修正前後で `B/op`（メモリ確保量）と `ns/op` が大きく減っていれば成功。

---

## Lv14 [タスク]：冒険の記録を整えよ

**修正ファイル：** `cmd/main.go`、`pkg/db/conn.go`

```go
// cmd/main.go
slog.Info("server starting", "port", cfg.Port)

// pkg/db/conn.go
slog.Info("connected to database")
slog.Warn("database not ready, retrying", "attempt", i, "max", 10)

// log.Fatal 相当（slogにFatalはないので Error + os.Exit）
slog.Error("failed to connect to database", "attempts", 10)
os.Exit(1)
```

JSON形式にする場合は main の先頭で：

```go
slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
```

---

## Lv15 [タスク]：時空の歪みを断ち切れ

**修正ファイル：** handler / service / repository の全層

repository の例（`pkg/server/repository/hero.go`）：

```go
func (r *HeroRepository) Get(ctx context.Context) (*service.Hero, error) {
    hero := &service.Hero{}
    row := r.db.QueryRowContext(ctx, `
        SELECT id, name, hp, max_hp, attack, level, experience
        FROM heroes WHERE id = 1
    `)
    ...
}

func (r *HeroRepository) UpdateExperience(ctx context.Context, experience int) error {
    _, err := r.db.ExecContext(ctx, `UPDATE heroes SET experience = ? WHERE id = 1`, experience)
    return err
}
```

handler の例（`pkg/server/handler/hero.go`）：

```go
func (h *HeroHandler) GetHero(c echo.Context) error {
    ctx := c.Request().Context()
    hero, err := h.heroRepo.Get(ctx)
    ...
}
```

- 対象：`repository/hero.go`、`repository/stage.go`、`repository/enemy.go` の全メソッドと、その呼び出し元の handler すべて
- `QueryRow` → `QueryRowContext` / `Query` → `QueryContext` / `Exec` → `ExecContext`
- コンパイルエラーを頼りに呼び出し元を順番に直していけばよい

---

## Lv16 [ステージ]：ギルドの依頼を同時にこなせ

**修正ファイル：** `pkg/server/service/quest.go` の `GatherQuestReports`

事前に `go get golang.org/x/sync/errgroup` が必要。

```go
import "golang.org/x/sync/errgroup"

// 修正後（約1秒で完了、1件でも失敗すれば全体がエラーになる）
func GatherQuestReports() ([]string, error) {
    quests := []string{"魔物の生息調査", "薬草の在庫確認", "地図の作成"}
    reports := make([]string, len(quests))
    g := new(errgroup.Group)
    for i, quest := range quests {
        g.Go(func() error {
            report, err := investigate(quest)
            if err != nil {
                return err
            }
            reports[i] = report
            return nil
        })
    }
    if err := g.Wait(); err != nil {
        return nil, err
    }
    return reports, nil
}
```

Go 1.22 以降はループ変数がイテレーションごとに新しい変数になるため、`i` / `quest` をそのままクロージャで使ってよい（1.21以前は引数渡しが必要だった）。

---

## Lv17 [ステージ]：悪霊の門を閉じろ

**修正ファイル：** `pkg/server/service/battle.go`

```go
// バグ版
var spiritGate = make(chan struct{})

func summonSpirit() {
    go func() {
        <-spiritGate // 閉じない門を待ち続ける → goroutineが増え続ける
    }()
}

func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    summonSpirit() // ← バグ: この呼び出しを削除する
    ...
}
```

**修正後：** `summonSpirit()` の呼び出しを削除する（`spiritGate` / `summonSpirit` ごと消してよい）。

別解：起動時などに `close(spiritGate)` すれば、待っている悪霊は全員解放される（closeされたchannelの受信は即座に返る）。

観測：

```bash
curl http://localhost:8080/api/debug/memory   # num_goroutine が増え続けなければOK
```

---

## Lv18 [ステージ]：呪いの爆弾を解除せよ

**修正ファイル：** `pkg/server/service/curse.go` の `DefuseCurse`

```go
import (
    "log"
    "time"
)

// 修正後
func DefuseCurse() string {
    go func() {
        defer func() {
            if r := recover(); r != nil {
                log.Printf("爆発を受け止めた: %v", r)
            }
        }()
        time.Sleep(1 * time.Second)
        panic("呪いの爆弾が爆発した！")
    }()
    return "解除を試みた……（1秒後に何かが起こる）"
}
```

ポイント：Echo の `middleware.Recover()` はリクエスト処理中の goroutine の panic しか拾えない。自前で起動した goroutine の panic はプロセス全体を落とすため、goroutine ごとに recover が必要。

---

## Lv19 [タスク]：古文書の解読は一度だけ

**修正ファイル：** `pkg/server/service/ancient.go`

```go
import (
    "sync"
    "time"
)

var (
    ancientLegend string
    decodeOnce    sync.Once
)

// 修正後
func DecodeAncientText() string {
    decodeOnce.Do(func() {
        time.Sleep(800 * time.Millisecond)
        ancientLegend = "『五つの試練の先に、火を吐く王が眠る』"
    })
    return ancientLegend
}
```

`sync.Once` は並行に呼ばれても中の関数を必ず1回しか実行しない（2回目以降は完了を待って即返る）。

---

## Lv20 [タスク]：クリティカルの乱数を現代化せよ

**修正ファイル：** `pkg/server/service/battle.go`

```go
// バグ版
import "math/rand"
var criticalRNG = rand.New(rand.NewSource(1)) // 固定シード

func RollCritical() bool {
    return criticalRNG.Intn(4) == 0
}

// 修正後（criticalRNG 変数は削除、import を math/rand/v2 に変更）
import "math/rand/v2"

func RollCritical() bool {
    return rand.IntN(4) == 0
}
```

`math/rand/v2`（Go 1.22）は自動でシードされ、`Seed` 関数自体が存在しない。トップレベルの `rand.IntN` をそのまま使えばよい。

---

## Lv21 [タスク]：二つの関数を一つに束ねよ

**修正ファイル：** `pkg/server/service/mathutil.go`、`mathutil_test.go`

```go
import "cmp"

// 修正後（MaxInt / MaxFloat64 を削除して1つに）
func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}
```

テストの書き換え例：

```go
func TestMax(t *testing.T) {
    if got := Max(3, 5); got != 5 {
        t.Errorf("Max(3, 5) = %d, want 5", got)
    }
    if got := Max(10, -2); got != 10 {
        t.Errorf("Max(10, -2) = %d, want 10", got)
    }
    if got := Max(1.5, 2.5); got != 2.5 {
        t.Errorf("Max(1.5, 2.5) = %f, want 2.5", got)
    }
}
```

---

## Lv22 [タスク]：手書きループを標準の剣で斬れ

**修正ファイル：** `pkg/server/service/ranking.go`

```go
import (
    "cmp"
    "slices"
    "strings"
)

// 修正後
func SortEnemiesByAttack(enemies []*Enemy) {
    slices.SortFunc(enemies, func(a, b *Enemy) int {
        return cmp.Compare(b.Attack, a.Attack) // b, a の順にすると降順
    })
}

func HasBoss(enemies []*Enemy) bool {
    return slices.ContainsFunc(enemies, func(e *Enemy) bool {
        return strings.Contains(e.Name, "ボス")
    })
}
```

既存のテスト（`ranking_test.go`）は書き換え不要。そのまま通れば挙動を保ったリファクタ成功。

---

## Lv23 [タスク]：時間停止の魔法でテストせよ

**修正ファイル：** `pkg/server/service/spell_test.go`（Skipを外す）、`pkg/server/service/spell.go`

Step 1 で Skip を外すと deadlock で panic する。これは synctest が「タイムアウト後、詠唱 goroutine が `done <- "メテオ"` の送信で永遠にブロックする」という goroutineリークを検出した結果。

```go
// spell.go 修正後（channelをバッファ付きに）
func castSpell() <-chan string {
    done := make(chan string, 1) // ← バッファ付き。送信側はブロックせず終了できる
    go func() {
        time.Sleep(10 * time.Second)
        done <- "メテオ"
    }()
    return done
}
```

```go
// spell_test.go（Skipを消した状態。スターターに最初から入っている）
func TestInterruptCast(t *testing.T) {
    synctest.Test(t, func(t *testing.T) {
        message, interrupted := InterruptCast()
        if !interrupted {
            t.Errorf("詠唱を中断できなかった: %s", message)
        }
        // ボスの詠唱（10秒）が終わるまで仮想時間で待つ（実時間は一瞬）
        time.Sleep(10 * time.Second)
    })
}
```

バブル内では `time.Sleep(10s)` も `time.After(2s)` も仮想時間で進むため、テストは数ミリ秒で完了する。
synctest は「テスト本体が終わった時点でブロックしたまま残っている goroutine」を deadlock として報告する。unbuffered channel だと詠唱 goroutine が送信で永遠にブロックするため、仮想時間をいくら進めても終了できず、リークとして検出される。

※ このテストは Lv11 修正後にしか通らない（修正前は `interrupted == false` で失敗する）。

---

## Lv24 [タスク]：酒場の席数を最適化せよ

**修正ファイル：** `pkg/db/conn.go` の `Connect`

```go
if pingErr := conn.Ping(); pingErr == nil {
    log.Println("Connected to database")
    // 修正後: プール設定を追加
    conn.SetMaxOpenConns(25)
    conn.SetMaxIdleConns(5)
    conn.SetConnMaxLifetime(5 * time.Minute)
    return conn
}
```

観測：

```bash
curl http://localhost:8080/api/debug/db
# 設定後は max_open が 25 になる。負荷をかけると open_connections が上限で頭打ちになり、
# 超えた分は wait_count に現れる。
```

---

## Lv25 [タスク]：伝説の単一バイナリ

**新規ファイル：** リポジトリ直下 `frontend_embed.go`

```go
package gopherslayer

import "embed"

// all: を付けると _ や . で始まるファイル/ディレクトリも埋め込める
//
//go:embed all:_frontend
var FrontendFS embed.FS
```

**修正ファイル：** `pkg/server/server.go`

```go
import gopherslayer "github.com/maropook/gopher-slayer"

// 修正前
e.Static("/", "_frontend")
e.Static("/images", "_frontend/images")

// 修正後（1行にまとまる。/images/... も embed.FS 内のパスで解決される）
e.StaticFS("/", echo.MustSubFS(gopherslayer.FrontendFS, "_frontend"))
```

確認：

```bash
go build -o /tmp/gopher-slayer-server ./cmd
cd /tmp && ./gopher-slayer-server
# ソースのないディレクトリから起動してもゲーム画面が表示される
```

ポイント：
- `go:embed` はそのファイルのあるディレクトリ以下しか参照できないため、`_frontend` を埋め込むファイルはリポジトリ直下に置く
- `_` 始まりのパスはデフォルトで埋め込み対象外なので `all:` プレフィックスが必須
