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

## Lv8：ゴブリンの群れを一掃せよ（Go経験者向け）

**症状：** ステージ選択画面の「ゴブリンの群れを一掃せよ」に挑むと、100体倒したはずなのに討伐数の記録が合わない。

**修正箇所：** `pkg/server/service/horde.go` の `SlayHorde`

100体の討伐を goroutine で同時に行っているが、討伐数カウンタ `killCount` を複数の goroutine が **mutex なし** で読み書きしている（データ競合 / Race Condition）。

**やること：**

1. データ競合を検出する

```bash
go test -race ./...
```

2. `sync.Mutex` でカウンタを守る

```go
var mu sync.Mutex

go func() {
    defer wg.Done()
    mu.Lock()
    killCount++
    mu.Unlock()
}()
```

**動作確認：** ゲーム画面のチャレンジで「討伐数 100/100」になればOK。curl でも確認できる：

```bash
curl -X POST http://localhost:8080/api/battle/horde
```

**体験できること：** データ競合（Race Condition）、`go test -race`、`sync.Mutex`

---

## Lv9：倒した敵の怨念を祓え（Go経験者向け）

**症状：** 戦うたびにバトル画面右上の「サーバーメモリ」が増え続ける。「怨念祓いの儀式」に挑むと、怨念（メモリ）が溜まりすぎていて祓えない。

**修正箇所：** `pkg/server/service/battle.go` の `HeroAttack` 周辺

グローバル変数 `grudges` に攻撃のたびに5MBのデータを append しており、**参照が残り続けるため GC がメモリを回収できない**（メモリリーク）。

**やること：**

1. メモリの増加を観測する

```bash
# APIで観測
curl http://localhost:8080/api/debug/memory

# GCの動きを観測しながら起動（gctrace）
GODEBUG=gctrace=1 make dev
```

2. リーク箇所（グローバル変数への append）を見つけて削除する
3. サーバーを再起動して、戦ってもメモリが増えないことを確認する

**動作確認：** ゲーム画面の「怨念祓いの儀式」チャレンジが成功すればOK（20連戦後にメモリ50MB未満）。

**体験できること：** GCの仕組み（参照が残ると回収されない）、メモリリーク、`runtime.MemStats`、`GODEBUG=gctrace=1`

**発展：** `net/http/pprof` を導入して `go tool pprof` でヒーププロファイルを取ってみよう。

---

## Lv10：幻のステージの番人（Go経験者向け）

**症状：** ステージ選択画面の「幻のステージの番人」に挑むと、サーバーで panic が発生する。サーバーログにスタックトレースが出ている。

**修正箇所：** `pkg/server/repository/stage.go` の `GetByID`

```go
err := row.Scan(...)
if err != nil {
    return nil, nil // ← エラーを握りつぶしている
}
```

エラーを握りつぶして `nil, nil` を返しているため、存在しないステージIDでは呼び出し側（`ClearStage`）が **nil ポインタを参照して panic** する。

**やること：** エラーをそのまま返すように修正する。

```go
if err != nil {
    return nil, err
}
```

**動作確認：**

```bash
# 修正前: panic（Internal Server Error）/ 修正後: 「ステージが見つかりません」
curl -X POST http://localhost:8080/api/stages/999/clear
```

**体験できること：** nil ポインタ参照と panic、エラーを握りつぶす危険性、`sql.ErrNoRows`

**発展：** handler 側で `errors.Is(err, sql.ErrNoRows)` を判定して 404 を返してみよう。

---

## Lv11：ボスの詠唱を中断せよ（Go経験者向け）

**症状：** 「ボスの詠唱を中断せよ」に挑むと、サーバーが10秒間固まって中断が間に合わない。

**修正箇所：** `pkg/server/service/spell.go` の `InterruptCast`

```go
// 今のコード（詠唱完了をただ待つだけ → 10秒固まる）
spell := <-castSpell()
return spell + " が発動してしまった…", false
```

**やること：** `select` と `time.After` を使って **2秒でタイムアウト** させ、「詠唱を中断させた！」を返す。

```go
select {
case spell := <-castSpell():
    return spell + " が発動してしまった…", false
case <-time.After(2 * time.Second):
    return "詠唱を中断させた！", true
}
```

**動作確認：**

```bash
# 修正前は10秒待たされる、修正後は2秒で返ってくる
curl -X POST http://localhost:8080/api/battle/interrupt
```

**体験できること：** channel、`select`、`time.After` によるタイムアウト制御

---

## Lv16：ギルドの依頼を同時にこなせ（Go経験者向け）

**症状：** 「ギルドの依頼調査」に挑むと、3つの依頼を1件ずつ調査して3秒かかり、ギルドの受付時間（2秒）に間に合わない。

**修正箇所：** `pkg/server/service/quest.go` の `GatherQuestReports`

**やること：** `golang.org/x/sync/errgroup` で3つの調査を並列化する。Lv6 の `sync.WaitGroup` と違い、**どれか1件でも失敗したら全体をエラーにできる**のがポイント。

```bash
go get golang.org/x/sync/errgroup
```

```go
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
```

Go 1.22 以降はループ変数 `i` / `quest` をそのままクロージャで使える（イテレーションごとに新しい変数になる）。

**動作確認：**

```bash
# 修正前は受付が閉まる（408）、修正後は約1秒で200
curl -X POST http://localhost:8080/api/quests/gather
```

**体験できること：** `errgroup` によるエラー付き並列処理、Go 1.22 のループ変数セマンティクス

---

## Lv17：悪霊の門を閉じろ（Go経験者向け）

**症状：** 敵の攻撃のたびに悪霊（goroutine）が漏れ出し、増え続ける。「悪霊の門」チャレンジ（30連戦して goroutine 数を観測）に失敗する。

**修正箇所：** `pkg/server/service/battle.go` の `summonSpirit`

閉じられることのない channel を永遠に待つ goroutine を、リクエストのたびに起動している（**goroutineリーク**）。goroutine はGCでは回収されない。

**やること：**

1. goroutine 数の増加を観測する

```bash
curl http://localhost:8080/api/debug/memory   # num_goroutine に注目
```

2. `summonSpirit()` の呼び出しを削除する（または門となる channel を `close` して悪霊を解放する）

**動作確認：** 「悪霊の門」チャレンジで、30連戦しても goroutine がほぼ増えなければOK。

**体験できること：** goroutineリーク、goroutineのライフサイクル、`runtime.NumGoroutine`

---

## Lv18：呪いの爆弾を解除せよ（Go経験者向け）

**症状：** 「呪いの爆弾」に挑むと、1秒後に **サーバーごと落ちる**。（`make dev` の air が自動で再起動してくれる）

**修正箇所：** `pkg/server/service/curse.go` の `DefuseCurse`

Echo には Recover ミドルウェアが入っているのに、なぜサーバーごと落ちるのか？
—— Recover が守れるのは**リクエストを処理している goroutine だけ**。自分で `go func()` した goroutine の中の panic は誰も拾えず、プロセス全体が死ぬ。

**やること：** goroutine の先頭に `defer` + `recover()` を仕込む。

```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("爆発を受け止めた: %v", r)
        }
    }()
    time.Sleep(1 * time.Second)
    panic("呪いの爆弾が爆発した！")
}()
```

**動作確認：** チャレンジ実行後もサーバーが生きていればOK。

```bash
curl -X POST http://localhost:8080/api/battle/defuse && sleep 2 && curl http://localhost:8080/api/hero
```

**体験できること：** panic / recover、goroutine 内の panic がプロセスを殺すこと、Recover ミドルウェアの守備範囲

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

## Lv12：戦場からの安全な撤退（Go経験者向け）

**症状：** `Ctrl+C` でサーバーを止めると即終了するため、処理中のリクエストが強制切断され、冒険者が戦場に取り残される。

**修正箇所：** `cmd/main.go`

**やること：** OSシグナルを受け取ってから、進行中のリクエストを待って安全に終了する（Graceful Shutdown）。

```go
// 別goroutineでサーバーを起動する
go func() {
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
```

**動作確認：** 時間のかかるAPI（例：Lv11修正前の `/api/battle/interrupt`）を処理中に `Ctrl+C` しても、レスポンスが返ってきてからサーバーが終了すればOK。

**体験できること：** OSシグナルのハンドリング、`e.Shutdown(ctx)`、`context.WithTimeout`

---

## Lv13：戦闘レポートを高速化せよ（Go経験者向け）

**症状：** 戦闘レポートの生成が遅い。文字列の `+=` 連結は毎回新しい文字列を作り直すため、行数が多いとメモリを大量に消費する。

**修正箇所：** `pkg/server/service/battle.go` の `BuildBattleReport`

### Step 1：ベンチマークで現状を計測する

```bash
go test ./pkg/server/service/ -bench BuildBattleReport -benchmem
```

`B/op`（1回あたりのメモリ確保量）と `ns/op`（1回あたりの時間）をメモしておこう。

### Step 2：strings.Builder に書き換える

```go
func BuildBattleReport(logs []string) string {
    var b strings.Builder
    for _, log := range logs {
        b.WriteString(log)
        b.WriteString("\n")
    }
    return b.String()
}
```

### Step 3：もう一度計測して比較する

`B/op` が大幅に減っていれば成功。

**体験できること：** `go test -bench` / `-benchmem`、`strings.Builder`、文字列連結のコスト

---

## Lv14：冒険の記録を整えよ（Go経験者向け）

**症状：** サーバーログが `log.Printf` のテキスト形式で、ログ集計ツールでの検索・集計ができない。

**修正箇所：** `cmd/main.go`、`pkg/db/conn.go`

**やること：** Go 1.21 標準の `log/slog` による構造化ログに置き換える。

```go
// 変更前
log.Printf("Database not ready, retrying... (%d/10)", i)

// 変更後
slog.Warn("database not ready, retrying", "attempt", i, "max", 10)
```

JSON形式で出したい場合：

```go
slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
```

**動作確認：** `make dev` の起動ログが構造化された形式（key=value または JSON）で出力されればOK。

**体験できること：** 構造化ログの利点、`log/slog`、ログレベル（Info/Warn/Error）

**発展：** Echo のアクセスログも slog に差し替えて、リクエストIDを全ログに含めてみよう。

---

## Lv15：時空の歪みを断ち切れ（Go経験者向け・最難関）

**症状：** プレイヤーが画面を閉じて（リクエストを中断して）も、サーバーはDBクエリを実行し続けている。キャンセルという概念がどこにも伝わっていない。

**修正箇所：** handler / service / repository の全層

**やること：** `context.Context` を第1引数として全層に伝播させ、DB呼び出しを context 対応版に置き換える。

```go
// repository（変更前 → 変更後）
func (r *HeroRepository) Get() (*service.Hero, error)
func (r *HeroRepository) Get(ctx context.Context) (*service.Hero, error) {
    row := r.db.QueryRowContext(ctx, `SELECT ...`)
    ...
}

// handler では Echo のリクエストから ctx を取り出す
ctx := c.Request().Context()
hero, err := h.heroRepo.Get(ctx)
```

- `QueryRow` → `QueryRowContext` / `Query` → `QueryContext` / `Exec` → `ExecContext`
- コンパイルエラーを頼りに、呼び出し元を順番に直していこう

**動作確認：**

```bash
# 1秒で切断してもサーバー側のクエリがキャンセルされることを確認
curl --max-time 1 http://localhost:8080/api/hero
```

**体験できること：** `context.Context` の役割（キャンセル・タイムアウトの伝播）、Goの慣用的なAPI設計

---

## Lv19：古文書の解読は一度だけ（Go経験者向け）

**症状：** ステージ選択画面を開くたびに「言い伝え」の表示が遅い（毎回800ms）。解読結果は変わらないのに、毎回解読し直している。

**修正箇所：** `pkg/server/service/ancient.go` の `DecodeAncientText`

**やること：** `sync.Once` で「最初の1回だけ」解読する。

```go
var once sync.Once
var ancientLegend string

func DecodeAncientText() string {
    once.Do(func() {
        time.Sleep(800 * time.Millisecond)
        ancientLegend = "『五つの試練の先に、火を吐く王が眠る』"
    })
    return ancientLegend
}
```

**動作確認：**

```bash
# 1回目は約800ms、2回目以降は一瞬で返ればOK
time curl http://localhost:8080/api/legend
time curl http://localhost:8080/api/legend
```

**体験できること：** `sync.Once`、一度きりの初期化（遅延初期化）、並行呼び出しでも1回しか実行されない保証

---

## Lv20：クリティカルの乱数を現代化せよ（Go経験者向け）

**症状：** サーバーを再起動するたび、クリティカル（会心の一撃）が**全く同じ順番**で出る。乱数が予測可能＝チートし放題。

**修正箇所：** `pkg/server/service/battle.go` の `RollCritical`

古い `math/rand` を固定シード（`rand.NewSource(1)`）で使っているのが原因。

**やること：** Go 1.22 で追加された `math/rand/v2` に移行する。

```go
import "math/rand/v2"

// criticalRNG 変数ごと削除して、こう書くだけでよい
func RollCritical() bool {
    return rand.IntN(4) == 0
}
```

v2 のポイント：
- 自動でシードされる（`rand.Seed` は不要。v1 の `Seed` は非推奨になった）
- `Intn` → `IntN` に改名され、`N()` などジェネリクス対応の関数も追加
- 生成アルゴリズムも高速・高品質なものに刷新

**動作確認：** サーバーを2回再起動して、それぞれ同じ順番で攻撃したとき、会心の一撃の出方が毎回変わればOK。

**体験できること：** `math/rand/v2`（Go 1.22）、シードと乱数の予測可能性、v1→v2 移行

---

## Lv21：二つの関数を一つに束ねよ（Go経験者向け）

**症状：** `pkg/server/service/mathutil.go` に、型が違うだけのほぼ同じ関数 `MaxInt` / `MaxFloat64` が2つある。

**やること：** ジェネリクス（型パラメータ）で1つにまとめる。

```go
import "cmp"

// [T cmp.Ordered] は「< で比較できる型なら何でも」という意味
func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}
```

呼び出し側は `Max(3, 5)` / `Max(1.5, 2.5)` と書くだけで型は推論される。
`mathutil_test.go` も新しい `Max` に合わせて書き換えよう。

**動作確認：**

```bash
go test ./pkg/server/service/ -run TestMax -v
```

**体験できること：** ジェネリクス（型パラメータ・型推論）、`cmp.Ordered`（Go 1.21）

**発展：** Go 標準にも `max` / `min` 組み込み関数がある（Go 1.21）。違いを調べてみよう。

---

## Lv22：手書きループを標準の剣で斬れ（Go経験者向け）

**症状：** `pkg/server/service/ranking.go` に手書きのバブルソートと検索ループがある。動くけれど、車輪の再発明。

**やること：** Go 1.21 で標準入りした `slices` パッケージで置き換える。

```go
import (
    "cmp"
    "slices"
    "strings"
)

func SortEnemiesByAttack(enemies []*Enemy) {
    slices.SortFunc(enemies, func(a, b *Enemy) int {
        return cmp.Compare(b.Attack, a.Attack) // 降順
    })
}

func HasBoss(enemies []*Enemy) bool {
    return slices.ContainsFunc(enemies, func(e *Enemy) bool {
        return strings.Contains(e.Name, "ボス")
    })
}
```

**動作確認：** 既存のテストがそのまま通れば、挙動を変えずにリファクタできた証拠。

```bash
go test ./pkg/server/service/ -run "TestSortEnemiesByAttack|TestHasBoss" -v
```

**体験できること：** `slices.SortFunc` / `slices.ContainsFunc` / `cmp.Compare`（Go 1.21）、テストに守られたリファクタリング

---

## Lv23：時間停止の魔法でテストせよ（Go経験者向け）

**前提：** Lv11（詠唱中断）を修正しておくこと。

**症状：** 詠唱中断のテストは実時間で2〜10秒かかる。時間に依存するコードのテストは遅くて不安定になりがち。

**修正箇所：** `pkg/server/service/spell_test.go`（と `spell.go`）

**やること：** Go 1.25 で標準入りした `testing/synctest` を使う。バブル内では `time.Sleep` や `time.After` が**仮想時間**で進むため、一瞬でテストが終わる。

### Step 1：Skip を外して実行する

```bash
go test ./pkg/server/service/ -run TestInterruptCast -v
```

**deadlock で panic するはず。** これはバグではなく、synctest が「詠唱 goroutine が永遠にブロックしたまま残る」という **goroutineリークを暴いた**結果。詠唱完了を channel に送ろうとしても、タイムアウト後は誰も受信しないからだ。

### Step 2：castSpell の channel をバッファ付きにする

```go
func castSpell() <-chan string {
    done := make(chan string, 1) // ← バッファ付きにすると送信側がブロックしない
    ...
}
```

### Step 3：再実行

テストが**一瞬で**通れば成功（実時間で2秒待たない）。

**体験できること：** `testing/synctest`（Go 1.25）、仮想時間によるテスト、synctest が goroutineリークを検出してくれること、バッファ付き channel

---

## Lv24：酒場の席数を最適化せよ（Go経験者向け）

**症状：** DBコネクションプールが未設定（デフォルト＝接続数無制限）。負荷をかけると接続が増え放題で、DBが悲鳴を上げる。

**修正箇所：** `pkg/db/conn.go` の `Connect`

**やること：** プールの設定を追加する。

```go
conn.SetMaxOpenConns(25)                 // 同時に開ける接続の上限
conn.SetMaxIdleConns(5)                  // 待機させておく接続数
conn.SetConnMaxLifetime(5 * time.Minute) // 接続の寿命
```

**動作確認：** 負荷をかけながら統計を観測する。

```bash
# 別ターミナルで負荷をかける
for i in $(seq 1 50); do curl -s http://localhost:8080/api/hero > /dev/null & done

# プールの状態を見る（max_open / open_connections / wait_count）
curl http://localhost:8080/api/debug/db
```

**体験できること：** `database/sql` のコネクションプール、`db.Stats()` による観測、リソース上限設計

---

## Lv25：伝説の単一バイナリ（Go経験者向け）

**症状：** `go build` したバイナリを別の場所にコピーして実行すると、APIは動くのにゲーム画面が表示されない。`_frontend` をディスクから読んでいるためだ。

**修正箇所：** `pkg/server/server.go` ＋ 新規ファイル

**やること：** `go:embed` でフロントエンドをバイナリに埋め込む。

### Step 1：リポジトリ直下に `frontend_embed.go` を作る

```go
package gopherslayer

import "embed"

// all: を付けると _ や . で始まるファイル/ディレクトリも埋め込める
//
//go:embed all:_frontend
var FrontendFS embed.FS
```

（`go:embed` は自分のパッケージより上のディレクトリを参照できないため、リポジトリ直下に置く）

### Step 2：`server.go` の配信を差し替える

```go
import gopherslayer "github.com/maropook/gopher-slayer"

// e.Static(...) 2行を削除して、こう置き換える
e.StaticFS("/", echo.MustSubFS(gopherslayer.FrontendFS, "_frontend"))
```

### Step 3：単一バイナリで動かす

```bash
go build -o /tmp/gopher-slayer-server ./cmd
cd /tmp && ./gopher-slayer-server   # ソースのない場所でもゲームが遊べる！
```

**体験できること：** `//go:embed`（`all:` プレフィックス）、`embed.FS`、単一バイナリ配布の威力

---

# 発展課題

クリアしたら好きなものに挑戦しよう。

| カテゴリ | チャレンジ例 |
|---------|------------|
| テスト | Integration Test, E2E Test, TDD, BDD, カバレッジ80% |
| DB | Redis, Index追加, Migration, N+1解消, Transaction |
| アーキテクチャ | クリーンアーキテクチャ, DDD, デザインパターン, DI |
| API品質 | バリデーション, 認証(JWT), Rate Limiting, エラーハンドリング統一 |
| 可観測性 | メトリクス(Prometheus), 分散トレーシング(OpenTelemetry), expvar |
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
