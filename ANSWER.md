# Gopher Slayer — 答え合わせ

各レベルの修正箇所と完成コードをまとめています（講師向け）。

## 目次

| Lv | タイトル | テーマ |
|----|---------|--------|
| [Lv1](#lv1ヒーローが攻撃しても0ダメージ) | ヒーローが攻撃しても0ダメージ | 関数の戻り値 |
| [Lv2](#lv2ステージをクリアしても経験値が増えない) | ステージをクリアしても経験値が増えない | DBへのUPDATE |
| [Lv3](#lv3hp編集ボタンを押すとエラーになる) | HP編集ボタンを押すとエラーになる | ルーティング追加 |
| [Lv4](#lv4デーモンへの攻撃が反転する) | デーモンへの攻撃が反転する | ハンドラーのデバッグ |
| [Lv5](#lv5ボスドラゴンの攻撃だけ遅い) | ボスドラゴンの攻撃だけ遅い | 2層またぎのデバッグ |
| [Lv6](#lv6姿の見えない敵) | 姿の見えない敵 | 公開/非公開・jsonタグ |
| [Lv7](#lv7鏡の鎧を打ち破れ) | 鏡の鎧を打ち破れ | 値レシーバ vs ポインタレシーバ |
| [Lv8](#lv8戦利品を袋に詰めろ) | 戦利品を袋に詰めろ | nil map / make |
| [Lv9](#lv9巨神gopherを検分せよ) | 巨神Gopherを検分せよ | 整数型とオーバーフロー |
| [Lv10](#lv10不死身の呪いを解けテストでバグを見つける) | 不死身の呪いを解け（テストでバグを見つける） | テーブル駆動テスト / ApplyDamage |
| [Lv11](#lv11討伐碑に名を刻め) | 討伐碑に名を刻め | string / rune / UTF-8 |
| [Lv12](#lv12分身gopherを見破れ) | 分身Gopherを見破れ | スライスの共有 / slices.Clone |
| [Lv13](#lv13討伐隊を整列させろ) | 討伐隊を整列させろ | mapの順序 / slices.Sort |
| [Lv14](#lv14幻のステージの番人) | 幻のステージの番人 | nil / エラー握りつぶし |
| [Lv15](#lv15宝物庫の扉を閉めろ) | 宝物庫の扉を閉めろ | defer / rows.Close |
| [Lv16](#lv16封印を並列に解かないとボスと戦えない) | 封印を並列に解かないとボスと戦えない | goroutine + WaitGroup |
| [Lv17](#lv17ゴブリンの群れを一掃せよ) | ゴブリンの群れを一掃せよ | Race Condition / Mutex |
| [Lv18](#lv18ボスの詠唱を中断せよ) | ボスの詠唱を中断せよ | select / time.After |
| [Lv19](#lv19ギルドの依頼を同時にこなせ) | ギルドの依頼を同時にこなせ | errgroup |
| [Lv20](#lv20眠るギルドに見切りをつけろ) | 眠るギルドに見切りをつけろ | http.Client の Timeout |
| [Lv21](#lv21城門の大渋滞を制圧せよ) | 城門の大渋滞を制圧せよ | セマフォ（バッファ付きchannel） |
| [Lv22](#lv22悪霊の門を閉じろ) | 悪霊の門を閉じろ | goroutineリーク |
| [Lv23](#lv23倒した敵の怨念を祓え) | 倒した敵の怨念を祓え | GC / メモリリーク |
| [Lv24](#lv24使い魔を家に帰せ) | 使い魔を家に帰せ | context.WithCancel |
| [Lv25](#lv25呪いの爆弾を解除せよ) | 呪いの爆弾を解除せよ | goroutine内panic / recover |
| [Lv26](#lv26討伐報告書を高速化せよ) | 討伐報告書を高速化せよ | strings.Builder / bench |
| [Lv27](#lv27古文書を速読せよ) | 古文書を速読せよ | sync.Once |
| [Lv28](#lv28予言者に打ち勝て) | 予言者に打ち勝て | math/rand/v2 |

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

## Lv3：HP編集ボタンを押すとエラーになる

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
result := service.HeroAttack(req)
// [Lv4 バグ仕込み箇所]
if req.EnemyName == "デーモン" {
    result.Damage = -result.Damage          // ← バグ: ダメージを反転
    result.Message = "攻撃が吸収された！" + result.Message
}

// 修正後（if ブロックを丸ごと削除）
result := service.HeroAttack(req)
return c.JSON(http.StatusOK, result)
```

---

## Lv5：ボスドラゴンの攻撃だけ遅い

バグが **2箇所** あります。両方直す必要があります。

### 修正1: `pkg/server/service/battle.go` の `EnemyAttack`

```go
// バグ版
if req.EnemyName == "ボスドラゴン" {
    time.Sleep(3 * time.Second)  // ← バグ: 削除する
}
```

### 修正2: `pkg/server/handler/battle.go` の `EnemyAttack`

```go
// バグ版
if req.EnemyName == "ボスドラゴン" {
    time.Sleep(5 * time.Second)  // ← バグ: 削除する
}
```

どちらも if ブロックを丸ごと削除する。

---

## Lv6：姿の見えない敵

**修正ファイル：** `pkg/server/service/stealth.go`

```go
// 修正前（小文字＝非公開なのでJSONに出ない）
type ScoutedEnemy struct {
    name   string
    hp     int
    attack int
}

// 修正後（大文字で公開し、jsonタグでキー名を指定）
type ScoutedEnemy struct {
    Name   string `json:"name"`
    HP     int    `json:"hp"`
    Attack int    `json:"attack"`
}

func ScoutEnemy() ScoutedEnemy {
    return ScoutedEnemy{Name: "ステルスGopher", HP: 55, Attack: 13}
}
```

フィールドを大文字にしたら、コンポジットリテラル（`ScoutEnemy` 内）のフィールド名も直すこと。

---

## Lv7：鏡の鎧を打ち破れ

**修正ファイル：** `pkg/server/service/mirror.go` の `TakeDamage`

```go
// 修正前（値レシーバ: コピーのHPを減らしているだけ）
func (k MirrorKnight) TakeDamage(damage int) {
    k.HP -= damage
}

// 修正後（ポインタレシーバ: 本体を変更できる）
func (k *MirrorKnight) TakeDamage(damage int) {
    k.HP -= damage
}
```

「メソッドがレシーバを変更するならポインタレシーバ」がGoの基本ルール。

---

## Lv8：戦利品を袋に詰めろ

**修正ファイル：** `pkg/server/service/loot.go` の `CollectLoot`

```go
// 修正前（nil map への書き込みで panic）
var bag map[string]int

// 修正後
bag := make(map[string]int)
```

nil map は読み取り（`bag["x"]` → 0）は安全だが、書き込みは panic する。

---

## Lv9：巨神Gopherを検分せよ

**修正ファイル：** `pkg/server/service/titan.go` の `ChallengeTitan`

```go
// 修正前（int8 は -128〜127。750 は入らずオーバーフロー）
var total int8
...
return int(total)

// 修正後
var total int
...
return total
```

25×30=750 を int8 で足すと 750 - 256×3 = -18 になる（値が一周する）。

---

## Lv10：不死身の呪いを解け（テストでバグを見つける）

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

## Lv11：討伐碑に名を刻め

**修正ファイル：** `pkg/server/service/naming.go` の `EngraveName`

```go
// 修正前（バイトで切るので日本語が壊れる）
if len(name) > 5 {
    return name[:5]
}
return name

// 修正後（runeに変換して「文字数」で切る）
r := []rune(name)
if len(r) > 5 {
    return string(r[:5])
}
return name
```

`len(string)` はバイト数、`len([]rune(s))` は文字数。日本語1文字はUTF-8で3バイト。

---

## Lv12：分身Gopherを見破れ

**修正ファイル：** `pkg/server/service/mirage.go` の `ChallengeMirage`

```go
// 修正前（同じ配列を共有しているので本体も変わる）
mirage = body

// 修正後（独立したコピーを作る）
mirage = slices.Clone(body)
```

import に `"slices"` を追加する。`make([]int, len(body))` + `copy(mirage, body)` でも同じ。

---

## Lv13：討伐隊を整列させろ

**修正ファイル：** `pkg/server/service/formation.go` の `FormBattleLine`

```go
// 修正後（取り出した後にソートして順序を安定させる）
var line []string
for name := range members {
    line = append(line, name)
}
slices.Sort(line) // ← これを追加
return line
```

import に `"slices"` を追加する。mapのrange順序がランダムなのは言語仕様（順序に依存したコードを書かせないため）。

---

## Lv14：幻のステージの番人

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

## Lv15：宝物庫の扉を閉めろ

**修正ファイル：** `pkg/server/repository/enemy.go` の `PeekVault`

```go
// 修正後（Queryの直後に defer で必ず閉める）
rows, err := r.db.Query(`SELECT id FROM enemies`)
if err != nil {
    return false, err
}
defer rows.Close() // ← これを追加
if rows.Next() {
    return true, nil
}
return false, rows.Err()
```

途中で return しても defer は必ず実行される。「取得したら直後に defer Close」がGoの作法。
（補足: rows を最後まで読み切った場合は自動で閉じられるが、途中で切り上げる場合は必須）

---

## Lv16：封印を並列に解かないとボスと戦えない

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

## Lv17：ゴブリンの群れを一掃せよ

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

## Lv18：ボスの詠唱を中断せよ

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

## Lv19：ギルドの依頼を同時にこなせ

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

## Lv20：眠るギルドに見切りをつけろ

**修正ファイル：** `pkg/server/service/courier.go` の `SendCourier`

```go
// 修正前（タイムアウトなし＝永遠に待つ）
client := &http.Client{}

// 修正後（2秒で諦めてエラーを返す）
client := &http.Client{Timeout: 2 * time.Second}
```

import に `"time"` を追加する。判定ハンドラーはエラーが2秒程度で返ってくれば「見切りをつけて帰還した」と判定する。

---

## Lv21：城門の大渋滞を制圧せよ

**修正ファイル：** `pkg/server/service/assault.go` の `LaunchAssault`

```go
// 修正後（バッファ付きchannelをセマフォにして同時5人に制限）
var wg sync.WaitGroup
sem := make(chan struct{}, 5)
for i := 0; i < 100; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        sem <- struct{}{} // 枠を取る（満員なら空くまで待つ）
        enterGate()
        time.Sleep(10 * time.Millisecond)
        leaveGate()
        <-sem // 枠を返す
    }()
}
wg.Wait()
```

enterGate/leaveGate（同時数カウンタ）は判定用なので残すこと。

---

## Lv22：悪霊の門を閉じろ

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

## Lv23：倒した敵の怨念を祓え

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
GODEBUG=gctrace=1 make start
```

ポイント：GC は「どこからも参照されていないメモリ」しか回収できない。グローバル変数に参照が残っている限りリークし続ける。

---

## Lv24：使い魔を家に帰せ

**修正ファイル：** `pkg/server/service/familiar.go`

```go
import (
    "context"
    "time"
)

// 修正後: ctx を受け取り、合図が来たら帰る
func summonOne(ctx context.Context) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return // 帰宅の合図で帰る
            case <-time.After(20 * time.Millisecond):
                // 雑用をこなす
            }
        }
    }()
}

func SummonFamiliars() {
    ctx, cancel := context.WithCancel(context.Background())
    for i := 0; i < 10; i++ {
        summonOne(ctx)
    }
    time.AfterFunc(100*time.Millisecond, cancel) // 仕事が終わったら全員に帰宅の合図
}
```

`cancel()` を呼ぶと `ctx.Done()` の channel が閉じ、待っている全goroutineに一斉に合図が届く。

---

## Lv25：呪いの爆弾を解除せよ

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

## Lv26：討伐報告書を高速化せよ

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
ゲーム画面の「討伐報告書」チャレンジ（40000行を1秒以内）も成功するようになる。

---

## Lv27：古文書を速読せよ

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

## Lv28：予言者に打ち勝て

**修正ファイル：** `pkg/server/service/battle.go`

```go
// バグ版
import "math/rand"
var criticalRNG = rand.New(rand.NewSource(1)) // 固定シード

func RollCritical() bool {
    criticalRolls++ // 予言者（Prophecy）の判定用カウンタ
    return criticalRNG.Intn(4) == 0
}

// 修正後（criticalRNG 変数は削除、import を math/rand/v2 に変更。
// criticalRolls++ は予言者の判定用なので残す）
import "math/rand/v2"

func RollCritical() bool {
    criticalRolls++
    return rand.IntN(4) == 0
}
```

`math/rand/v2`（Go 1.22）は自動でシードされ、`Seed` 関数自体が存在しない。トップレベルの `rand.IntN` をそのまま使えばよい。

判定の仕組み：`pkg/server/service/prophecy.go`（変更不要）が「固定シード1の math/rand を判定回数ぶん早送りした未来」を予言し、実際の判定12回と突き合わせる。固定シードのままだと全的中（`all_match: true`）、v2 に移行すると予言は外れる。

```bash
# 修正前は all_match: true、修正後は false
curl -X POST http://localhost:8080/api/battle/prophecy
```

---

# 設定後は max_open が 25 になる。負荷をかけると open_connections が上限で頭打ちになり、
# 超えた分は wait_count に現れる。
```

---

# ソースのないディレクトリから起動してもゲーム画面が表示される
```

ポイント：
- `go:embed` はそのファイルのあるディレクトリ以下しか参照できないため、`_frontend` を埋め込むファイルはリポジトリ直下に置く
- `_` 始まりのパスはデフォルトで埋め込み対象外なので `all:` プレフィックスが必須
