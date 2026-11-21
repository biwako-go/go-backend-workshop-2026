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
| [Lv10](#lv10不死身の呪いを解けテストでバグを見つける) | 不死身の呪いを解け（テストでバグを見つける） | テーブル駆動テスト / FinishingBlow |
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
| [Lv29](#lv29骸骨兵の行進を止めろ) | 骸骨兵の行進を止めろ | range-over-func / yield（Go 1.23） |
| [Lv30](#lv30禁書庫を守り抜け) | 禁書庫を守り抜け | os.Root（Go 1.24） |
| [Lv31](#lv31援軍を揃えて出陣せよ) | 援軍を揃えて出陣せよ | WaitGroup.Go / go vet（Go 1.25） |
| [Lv32](#lv32結界の弱点を見抜け) | 結界の弱点を見抜け | errors.AsType（Go 1.26） |
| [Lv33](#lv33偽造された請求書を見破れ) | 偽造された請求書を見破れ | encoding/json/v2（Go 1.27） |
| [Lv34](#lv34ものまねミミックの鑑定書を正せ) | ものまねミミックの鑑定書を正せ | new(式)（Go 1.26） |
| [Lv35](#lv35なりすましgopherを締め出せ) | なりすましGopherを締め出せ | uuid パッケージ（Go 1.27） |
| [Lv36](#lv36置き去りの伝書鳩を救え) | 置き去りの伝書鳩を救え | goroutineleak プロファイル（Go 1.27） |
| [Lv37](#lv37地図喰いgopherの罠を見抜け) | 地図喰いGopherの罠を見抜け | nil チェックの修正 / err を先に確かめる（Go 1.25） |
| [Lv38](#lv38偽りの使者の送金を止めろ) | 偽りの使者の送金を止めろ | http.CrossOriginProtection（Go 1.25） |
| [Lv39](#lv39天空の砦へ伝令を届けろ) | 天空の砦へ伝令を届けろ | net/url の厳格化 / net.JoinHostPort（Go 1.26） |
| [Lv40](#lv40監査官の言いがかりを封じろ) | 監査官の言いがかりを封じろ | slog.NewMultiHandler（Go 1.26） |
| [Lv41](#lv41本物の勅書を見抜け) | 本物の勅書を見抜け | strings.CutLast（Go 1.27） |
| [Lv42](#lv42道具袋の爆弾を見分けろ) | 道具袋の爆弾を見分けろ | ジェネリックメソッド（Go 1.27） |

**最新Goキャッチアップモード：** ステージ選択画面の「⚡ 最新Goキャッチアップ」ボタン（または `/?mode=catchup`）で、Go 1.25〜1.27 の新機能のレベル（Lv31〜Lv42 のうち12レベル）だけを EXP に関係なく挑戦できる。クリアしても EXP は増えず、クリア状況はブラウザの localStorage に記録される（本編の進行には影響しない）。対象は `_frontend/game.js` の `ADVANCED_CHALLENGES` の `go` と `CATCHUP_VERSIONS` で決まる。

**開発者向けデバッグモード：** `/?debug` を開くとステージ選択画面にデバッグパネルが出る。パスフレーズ（講師・開発者に確認。リポジトリには平文を置いていない）で解錠すると、「LvN までクリア済みにする」（`PUT /api/hero/experience` でEXPをDBに保存。Lv0 で0に戻す）と、キャッチアップの全クリア／クリア記録の消去ができる。解錠状態はそのタブの間だけ（sessionStorage）保持され、「終了」で閉じる。パスフレーズは `game.js` の `DEBUG_SECRET`（PBKDF2-SHA256 で導いた鍵の AES-GCM 暗号文）を復号できるかで確かめる。

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

**テストケース例（`undead_test.go`）：**

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

**修正ファイル：** `pkg/server/service/undead.go` の `FinishingBlow`

```go
// 修正前
func FinishingBlow(currentHP, damage int) int {
    if currentHP-damage < 0 {
        return 1  // ← バグ: 0 にすべき
    }
    return currentHP - damage
}

// 修正後
func FinishingBlow(currentHP, damage int) int {
    if currentHP-damage < 0 {
        return 0
    }
    return currentHP - damage
}
```

補足：通常バトルの `ApplyDamage`（battle.go）は最初から正しい実装で、どのレベルでもHPが0になればGAME OVERになる（全回復してステージ選択へ戻る）。

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
    return criticalRNG.Intn(4) == 0
}

// 修正後（criticalRNG 変数は削除、import を math/rand/v2 に変更）
import "math/rand/v2"

func RollCritical() bool {
    return rand.IntN(4) == 0
}
```

`math/rand/v2`（Go 1.22）は自動でシードされ、`Seed` 関数自体が存在しない。トップレベルの `rand.IntN` をそのまま使えばよい。

判定の仕組み：`pkg/server/service/prophecy.go`（変更不要）が実際の判定40回を引き、その並びが「固定シード1の math/rand が生む列」のどこかの区間と一致するかを調べる。固定シードのままだと必ず一致（`all_match: true`）、v2 に移行すると列が毎回変わるので予言は外れる。

```bash
# 修正前は all_match: true、修正後は false
curl -X POST http://localhost:8080/api/battle/prophecy
```

---

## Lv29：骸骨兵の行進を止めろ

**修正ファイル：** `pkg/server/service/march.go` の `SkeletonMarch`

```go
// 修正前（yield の戻り値を無視して送り出し続ける）
func SkeletonMarch() iter.Seq[string] {
    return func(yield func(string) bool) {
        for _, s := range skeletonLegion {
            yield(s)
        }
    }
}

// 修正後（yield が false を返したら＝呼び出し側が break したら止まる）
func SkeletonMarch() iter.Seq[string] {
    return func(yield func(string) bool) {
        for _, s := range skeletonLegion {
            if !yield(s) {
                return
            }
        }
    }
}
```

`for s := range SkeletonMarch() { ... }` は、コンパイラが「ループ本体を yield 関数に変換し、`SkeletonMarch()` の戻り値に渡す」形に書き換えて実行する。本体が `break` すると yield は `false` を返し、それでも yield を呼ぶとランタイムが panic（`range function continued iteration after function for loop body returned false`）で止める。イテレータを自作するときは「yield の戻り値を必ず見る」がルール。

判定ハンドラー（`handler/battle.go` の `March`）は panic を recover して画面にメッセージを返す（サーバーログにも `[Lv29]` 付きで出る）。迎え撃つ側の `RepelSkeletonMarch` から `break` を消すと6体全員と戦うことになり、判定は失敗する。

補足：Go 1.23 以降、標準ライブラリにもイテレータを返す関数が増えている（`slices.All` / `slices.Values` / `maps.Keys` / `strings.SplitSeq`（Go 1.24）など）。

---

## Lv30：禁書庫を守り抜け

**修正ファイル：** `pkg/server/service/library.go` の `LendScroll`

```go
// 修正前（名前をそのままつなぐので「..」や抜け道で外に出られる）
func LendScroll(libraryDir, name string) (string, error) {
    data, err := os.ReadFile(filepath.Join(libraryDir, name))
    if err != nil {
        return "", err
    }
    return string(data), nil
}

// 修正後（書庫をルートとして開き、その外には出られないようにする）
func LendScroll(libraryDir, name string) (string, error) {
    root, err := os.OpenRoot(libraryDir)
    if err != nil {
        return "", err
    }
    defer root.Close()
    data, err := root.ReadFile(name)
    if err != nil {
        return "", err
    }
    return string(data), nil
}
```

使わなくなる `"path/filepath"` を import から外す。`os.Root`（Go 1.24）経由の操作は、`..` やシンボリックリンクでルートの外へ出ようとすると `path escapes from parent` エラーになる。`Root.ReadFile` は Go 1.25 で追加された（1.24 の範囲なら `os.OpenInRoot(libraryDir, name)` で開いて `io.ReadAll` でもよい）。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `Library`）が毎回一時ディレクトリに `library/`（薬草の図鑑.txt と、`../forbidden` を指すシンボリックリンク「抜け道」）と `forbidden/`（禁呪の書.txt）を作り、3通りの依頼を試す。`filepath.IsLocal(name)` や `strings.Contains(name, "..")` のチェックだけだと、`../` は防げても「抜け道/禁呪の書.txt」が通ってしまうのでクリアにならない（シンボリックリンクを作れない環境では、抜け道の検査は省かれる）。

---

## Lv31：援軍を揃えて出陣せよ

**修正ファイル：** `pkg/server/service/reinforce.go` の `MusterReinforcements`

```go
// 修正前（Add を goroutine の中で呼んでいるので、Wait が先に終わることがある）
for range 10 {
    go func() {
        wg.Add(1)
        defer wg.Done()
        time.Sleep(20 * time.Millisecond)
        arrived.Add(1)
    }()
}
wg.Wait()

// 修正後（Go 1.25 の wg.Go: Add(1)・goroutine の起動・Done() をまとめてやってくれる）
for range 10 {
    wg.Go(func() {
        time.Sleep(20 * time.Millisecond)
        arrived.Add(1)
    })
}
wg.Wait()
```

従来の書き方（`go` の**前**で `wg.Add(1)`）でもクリアできるが、`wg.Go` なら Add / Done の書き忘れ・書く位置の間違いが起こり得ない。

`go vet ./...` は修正前のコードに `WaitGroup.Add called from inside new goroutine` と指摘する（Go 1.25 で追加された waitgroup チェック）。このチェックは `go test` が自動で走らせる vet の項目には含まれないので、`go vet` を明示的に実行するのがポイント。

判定の仕組み：バグ状態でも、1回の出陣のうち1割ほどは「たまたま」全部隊が間に合う（どれか1部隊でも Wait より先に Add すると、Wait が待ち始め、その間に残りの部隊も Add するため）。そのため判定ハンドラー（`handler/battle.go` の `Reinforce`）は出陣を10回くり返し、10回とも揃ったときだけ成功にしている。

---

## Lv32：結界の弱点を見抜け

**修正ファイル：** `pkg/server/service/barrier.go` の `BreakBarriers`

```go
// 修正前（型アサーションは、%w で包まれたエラーの中まで見ない）
if be, ok := err.(*BarrierError); ok {

// 修正後（Go 1.26 の errors.AsType: 包みを1枚ずつ開けて *BarrierError を探す）
if be, ok := errors.AsType[*BarrierError](err); ok {
```

import に `"errors"` を追加する。Go 1.25 以前の書き方なら次のとおり（これでもクリアできる）：

```go
var be *BarrierError
if errors.As(err, &be) {
```

`errors.As` は受け皿の変数を用意してポインタで渡す必要があり、渡し方を間違えると panic する（`go vet` の errorsas チェックが見張っている）。`errors.AsType` は欲しい型を型引数で指定して戻り値で受け取るので、取り違えようがない。

---

## Lv33：偽造された請求書を見破れ

**修正ファイル：** `pkg/server/service/forgery.go`

```go
// 修正前
import "encoding/json"

// 修正後（Go 1.27 で正式に入った v2。json.Unmarshal の呼び方は同じ）
import "encoding/json/v2"
```

判定で使う偽造請求書に対する v1 と v2 の違い：

| 入力 | v1（`encoding/json`） | v2（`encoding/json/v2`） |
|------|---------------------|------------------------|
| `{"quest":"スライム討伐","reward":100,"REWARD":99999}` | 大文字・小文字を区別しない → reward = 99999 | 区別する → `REWARD` は未知のキーとして無視され reward = 100 |
| `{"quest":"スライム討伐","reward":100,"reward":99999}` | 重複キーは後勝ち → reward = 99999 | `duplicate object member name "reward"` エラー |

ほかにも v2 では「nil のスライス / マップを `null` ではなく `[]` / `{}` で出力する」「不正な UTF-8 をエラーにする」など、既定の挙動が安全側に変わっている。v1 の挙動が必要な箇所だけ `json.MatchCaseInsensitiveNames(true)` などのオプションで個別に戻せる。

補足：このプロジェクトの他のAPI（Echo の `c.Bind` / `c.JSON`）は今も v1 の `encoding/json` で動いている。

---

## Lv34：ものまねミミックの鑑定書を正せ

**修正ファイル：** `pkg/server/service/appraise.go` の `AppraiseTreasures`

```go
// 修正前（ループの外の変数 bonus を使い回し、全部の宝が同じ変数を指す）
var appraised []Treasure
var bonus int
for _, t := range treasureVault {
    ...
    bonus = t.value * 2
    appraised = append(appraised, Treasure{Name: t.name, Bonus: &bonus})
}

// 修正後（Go 1.26 の new(式): 宝ごとに新しい変数を作ってポインタを返す）
var appraised []Treasure
for _, t := range treasureVault {
    ...
    appraised = append(appraised, Treasure{Name: t.name, Bonus: new(t.value * 2)})
}
```

`var bonus int` の行は不要になるので消す。`&(t.value * 2)` のように式のアドレスは取れないため、これまでは一時変数を作るか `func ptr[T any](v T) *T { return &v }` のようなヘルパーを書いていた。Go 1.26 で `new` が式を受け取れるようになり、その必要がなくなった。

従来の直し方（ループの中で `bonus := t.value * 2` と宣言する）でもクリアできる。Go 1.22 以降は、ループの中で宣言した変数はイテレーションごとに別物になるため。

---

## Lv35：なりすましGopherを締め出せ

**修正ファイル：** `pkg/server/service/roster.go` の `IssueAdventurerID`

```go
// 修正前（同じミリ秒の登録で番号がかぶる）
import (
    "fmt"
    "time"
)

func IssueAdventurerID() string {
    return fmt.Sprintf("ADV-%d", time.Now().UnixMilli())
}

// 修正後（Go 1.27 の標準 uuid パッケージ。v7 は発行順に並ぶ）
import "uuid"

func IssueAdventurerID() string {
    return uuid.NewV7().String()
}
```

UUIDv7 は先頭48ビットがミリ秒の時刻で、残りはほぼ乱数。Go の実装は時刻の後ろの12ビットにミリ秒未満の時刻を入れ、前回と同じかそれより前になりそうなら1つ進めるので、同じプロセス内では（システムの時計が巻き戻らない限り）発行順に並ぶ。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `Roster`）が100人を続けて登録し、「重複なし」かつ「文字列として比べたとき登録順に並ぶ」を確かめる。`uuid.New()`（v4）だと重複はなくなるが並び順が崩れて失敗する（v4 と v7 の違いを体験させるため）。

---

## Lv36：置き去りの伝書鳩を救え

**修正ファイル：** `pkg/server/service/pigeon.go` の `SendPigeons`

```go
// 修正前（バッファなし: 受け取り手がいないと送信で永遠に止まる）
replies := make(chan string)

// 修正後（塔の数だけバッファを用意: 受け取り手がいなくても返事を置いて帰れる）
replies := make(chan string, len(pigeonTowers))
```

観測方法：`curl http://localhost:8080/api/debug/goroutineleak`（`handler/debug.go` の `GoroutineLeak`。変更不要）。修正前は次のように、止まっている行が分かる。

```text
goroutineleak profile: total 3
3 @ 0x... 0x... 0x... 0x... 0x...
#	0x...	github.com/maropook/gopher-slayer/pkg/server/service.SendPigeons.func1+0x5b	.../pkg/server/service/pigeon.go:32
```

goroutineleak プロファイル（Go 1.26 で実験機能として入り、Go 1.27 で標準になった）は、プロファイルを取るときに特別な GC を走らせ、「到達できなくなった channel やロックを待って止まっている goroutine」を漏れとして報告する。グローバル変数の channel を待つ goroutine（Lv22 の悪霊）は、まだ誰かが close できる可能性があるため報告されない。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `Pigeons`）が鳩を飛ばす前後でプロファイルを取り、service パッケージ内で漏れた goroutine の増加数を数える。あわせて出発まで200ms未満であることも確かめるので、タイムアウトを消して「全部の鳩を待つ」直し方では失敗になる。送信側を `select` + `default`（受け取り手がいなければ諦める）にする直し方でもクリアできる。

---

## Lv37：地図喰いGopherの罠を見抜け

**修正ファイル：** `pkg/server/service/oldmap.go` の `ReadTreasureMap`

```go
// 修正前（err を確かめる前に f を使っている）
f, err := os.Open(filepath.Join(mapDir, name))
title := f.Name()
if err != nil {
    return "", err
}

// 修正後（err を先に確かめてから f を使う）
f, err := os.Open(filepath.Join(mapDir, name))
if err != nil {
    return "", err
}
title := f.Name()
```

Go 1.25 のリリースノートに載っている例とほぼ同じ形。Go 1.21〜1.24 のコンパイラには nil チェックを後回しにしてしまうバグがあり、`err != nil` のときに先に `return` して panic しないことがあった。Go 1.25 で直り、このコードは存在しないファイルで必ず panic する。「Go を上げたら落ちるようになった」場合、悪いのはコンパイラではなく元のコード。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `OldMap`）が毎回一時ディレクトリに地図庫を作り、「東の洞窟.txt」が読めること、存在しない「西の遺跡.txt」では panic せずにエラーが返ることを確かめる。panic はハンドラーが recover して画面に返す（サーバーログにも `[Lv37]` 付きで出る）。

---

## Lv38：偽りの使者の送金を止めろ

**修正ファイル：** `pkg/server/service/treasury.go` の `NewTreasuryHandler`

```go
// 修正前（どこのサイトからのリクエストでも送金する）
return mux

// 修正後（Go 1.25: 別サイトからのブラウザのリクエストを拒否する）
return http.NewCrossOriginProtection().Handler(mux)
```

`http.CrossOriginProtection` は、`Sec-Fetch-Site` ヘッダー（2023年以降のすべてのブラウザが付ける）か、`Origin` と `Host` の比較で別サイトからのリクエストを見分け、GET / HEAD / OPTIONS 以外を 403 で拒否する。どちらのヘッダーもないリクエストは「同じサイトか、ブラウザ以外」とみなして通す。信頼する別オリジンは `AddTrustedOrigin` で追加できる。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `DefendTreasury`）が `httptest` で3通りのリクエスト（同じサイト / 別サイト / ヘッダーなし）を窓口に直接渡し、実際に送金されたかを見る。送金を全部止める直し方は、正しい送金も止まるので失敗する。

---

## Lv39：天空の砦へ伝令を届けろ

**修正ファイル：** `pkg/server/service/fortress.go` の `FortressStatusURL`

```go
// 修正前（IPv6 だと http://2001:db8::10:8443/status になる）
import "fmt"

return fmt.Sprintf("http://%s:%d/status", host, port)

// 修正後（IPv6 のときだけ自動で [2001:db8::10]:8443 になる）
import (
    "net"
    "strconv"
)

return "http://" + net.JoinHostPort(host, strconv.Itoa(port)) + "/status"
```

Go 1.26 で追加された GODEBUG 設定 `urlstrictcolons`（go.mod が Go 1.26 以上なら既定で有効）による変化。Go 1.25 までの `url.Parse` は `http://2001:db8::10:8443/status` を `Hostname()="2001:db8::10"`、`Port()="8443"` と最後のコロンで区切って、あいまいなまま読めてしまっていた。`GODEBUG=urlstrictcolons=0` で以前の挙動に戻せるが、あいまいな URL を受け付けることになるので勧めない。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `Fortress`）が3つの砦（ホスト名・IPv4・IPv6）の URL を作らせ、`url.Parse` で読めて、ホストとポートを正しく取り出せるかを確かめる（実際の通信はしない）。

---

## Lv40：監査官の言いがかりを封じろ

**修正ファイル：** `pkg/server/service/chronicle.go` の `RecordBattle`

```go
// 修正前（logger を2つ作り、毎回両方に書く。討伐だけ監査用に書き忘れている）
boardLog := slog.New(slog.NewTextHandler(&boardBuf, nil))
auditLog := slog.New(slog.NewJSONHandler(&auditBuf, nil))
boardLog.Info("戦闘開始", "stage", "東の洞窟")
auditLog.Info("戦闘開始", "stage", "東の洞窟")
for _, e := range battleEvents {
    boardLog.Info("討伐", "enemy", e.enemy, "damage", e.damage)
}
...

// 修正後（Go 1.26: 1つの logger から両方のハンドラーへ書き出す）
logger := slog.New(slog.NewMultiHandler(
    slog.NewTextHandler(&boardBuf, nil),
    slog.NewJSONHandler(&auditBuf, nil),
))
logger.Info("戦闘開始", "stage", "東の洞窟")
for _, e := range battleEvents {
    logger.Info("討伐", "enemy", e.enemy, "damage", e.damage)
}
logger.Info("戦闘終了", "result", "勝利")
```

`MultiHandler` は、有効な（`Enabled` が true の）ハンドラーすべてに同じ記録を渡す。形式（テキスト / JSON）やログレベルはハンドラーごとに決められる。以前は、これを自前のハンドラーとして書く必要があった。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `Chronicle`）が、掲示板（テキスト）の `msg=討伐` の行と、監査記録（1行1JSON）の `"msg":"討伐"` の行を数え、どちらも3件あるかを確かめる。

---

## Lv41：本物の勅書を見抜け

**修正ファイル：** `pkg/server/service/decree.go` の `ReadDecree`

```go
// 修正前（最初の「--」で切る）
return strings.Cut(decree, "--")

// 修正後（Go 1.27: 最後の「--」で切る）
return strings.CutLast(decree, "--")
```

`strings.CutLast(s, sep)` は `strings.Cut` の「最後の区切り」版で、戻り値の形も同じ（区切りが見つからなければ `s, "", false`）。以前は `i := strings.LastIndex(s, sep)` で位置を探して `s[:i]` と `s[i+len(sep):]` に切り分けていた。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `Decree`）が、本物の勅書2通（そのうち1通は本文に「--」を含む）と偽物1通を読ませ、本物は署名と本文を正しく読み取り、偽物は退けることを確かめる。

---

## Lv42：道具袋の爆弾を見分けろ

**修正ファイル：** `pkg/server/service/satchel.go` の `Take` と `DrinkPotions`

```go
// 修正前（any で返し、使う側が決め打ちで型アサーションする）
func (s *Satchel) Take(name string) any {
    return s.items[name]
}

func DrinkPotions(s *Satchel, names []string) int {
    healed := 0
    for _, name := range names {
        p := s.Take(name).(Potion) // ← 爆弾で panic
        healed += p.Heal
    }
    return healed
}

// 修正後（Go 1.27 のジェネリックメソッド: 型を指定して取り出し、違う型なら ok=false）
func (s *Satchel) Take[T any](name string) (T, bool) {
    item, ok := s.items[name].(T)
    return item, ok
}

func DrinkPotions(s *Satchel, names []string) int {
    healed := 0
    for _, name := range names {
        if p, ok := s.Take[Potion](name); ok {
            healed += p.Heal
        }
    }
    return healed
}
```

型パラメータ `T` は引数から推論できないので、呼び出し側で `s.Take[Potion](name)` と明示する。インターフェースのメソッドには型パラメータを付けられない点に注意。標準ライブラリでも、Go 1.27 で `math/rand/v2` の `(*Rand).N` がジェネリックメソッドとして追加された。

呼び出し側だけを comma-ok（`p, ok := s.Take(name).(Potion)`）に直してもクリアできる。ジェネリックメソッドにしておくと、型アサーションを使う側に書かせずに済み、`any` から取り出すたびに panic の危険を意識しなくてよくなる。

判定の仕組み：判定ハンドラー（`handler/battle.go` の `OpenSatchel`）が、回復薬3つ（30・50・100）と爆弾1つを袋に入れて `DrinkPotions` を呼び、panic せずに合計180回復することを確かめる。panic はハンドラーが recover して画面に返す（サーバーログにも `[Lv42]` 付きで出る）。

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
