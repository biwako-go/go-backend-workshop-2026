# Gopher Slayer - Workshop Tasks

各レベルで「動かないゲームのバグを直す」ことで、GoのAPI開発を体験する。

- **Lv1〜Lv5**：ステージをクリアしながら順番に進む。バグを直さないと先へ進めない
- **Lv6〜Lv28**：全ステージクリア（EXP 500）でLv6の敵が現れる。カードをクリックすると敵とのエンカウントが始まり、**「たたかう」を押すと攻撃＝クリア判定**。バグを直せていれば攻撃が通って敵のHPを削り倒せる（直せていないと敵に反撃される）。倒すと **EXP +100** で次の敵が解放される（Lv1〜5と同じ一本道）
- 失敗してもその場でコードを直せば、画面を出ずにもう一度「たたかう」で再挑戦できる（`make start` の air が自動で反映する）
- チャレンジの敵もDB（`challenge_enemies` テーブル）に入っている
- 各カードの「ヒント」ボタンで、修正すべきファイルと確認コマンドがいつでも見られる
- 答えは見ずにまず自力で。どうしても詰まったら講師に聞こう（答えは ANSWER.md にある）

---

# ステージ

## Lv1：ヒーローが攻撃しても0ダメージ

**症状：** 攻撃ボタンを押しても「0 ダメージを与えた！」と表示され、敵のHPが減らない。

**修正箇所：** `pkg/server/service/battle.go` の `CalculateDamage`

```go
// ダメージを計算する関数
func CalculateDamage(attack int) int {
    return 0 // ← ここを修正する
}
```

**ヒント：** 攻撃力（引数 `attack`）をもとにダメージを返すように書き換える。そのまま返すだけでもOK。

**クリア判定：** バトルで敵のHPが減り、ステージ1「森」をクリアできればOK。

**体験できること：** 関数の役割・戻り値の理解

---

## Lv2：経験値がサーバーに保存されない

**症状：** ステージ1をクリアすると次のステージ（洞窟）には進める。しかしリザルト画面に「🐛 バグ発見！EXPがサーバー（DB）に保存されていない」と警告が出ており、**ステージ2をクリアしてもEXPが保存されないためステージ3は解放されない**。リロードすると進捗もすべて消える。

**修正箇所：** `pkg/server/handler/stage.go` の `ClearStage`

**ヒント：**
- 経験値 `newExp` を計算した後、**DBに保存する処理が抜けている**
- `h.heroRepo.UpdateExperience(newExp)` を呼び、エラーもチェックしよう
- 書き方は `pkg/server/repository/hero.go` の `UpdateName()` の呼び出し側（`handler/hero.go`）が参考になる

**クリア判定：** 修正してステージをクリアし直すと🐛警告が**出なくなり**、リロードしても進捗（EXPと解放済みステージ）が残ればOK。

**体験できること：** DBへの書き込み（UPDATE）、「保存しない状態はリロードで消える」というBackendの本質

---

## Lv3：ラストステージのボスが強すぎて詰んだ

**症状：** 「ボスドラゴン」の攻撃力は50。まともに戦っても勝てない。ゲーム画面の「HP編集」ボタンを押すと「APIが見つかりません」とエラーになる。`PUT /api/hero/hp` のルートが登録されていないためだ。

**修正箇所：** `pkg/server/handler/setting.go`

**ヒント：** `hero.UpdateHP` はすでに実装済み。他のルートにならって、この1行を追加するだけ。

```go
api.PUT("/hero/hp", hero.UpdateHP)
```

コードの流れも追ってみよう：`setting.go`（ルーティング）→ `handler/hero.go` の `UpdateHP()` → `repository/hero.go` の `UpdateHP()` → `UPDATE heroes SET hp = ...`

**クリア判定：** 「HP編集」ボタンで「HPを◯◯に設定しました！」と表示されればOK。HPを盛ってボスに挑もう。

**体験できること：** ルーティング追加、リクエストがDBに届くまでの流れ

---

## Lv4：デーモンへの攻撃が反転する

**症状：** 「地獄の門」の「デーモン」を攻撃すると、なぜかデーモンのHPが**増える**。

**修正箇所：** `pkg/server/handler/battle.go` の `Attack`

**ヒント：** ハンドラーの中に怪しいコードが仕込まれている。コードをよく読んで見つけよう。

**クリア判定：** デーモンのHPが減るようになり、「地獄の門」をクリアできればOK。

**体験できること：** ハンドラー層のデバッグ、処理の流れを追う読解力

---

## Lv5：ボスドラゴンの攻撃だけ遅い

**症状：** 「ドラゴンの巣」の「ボスドラゴン」の攻撃だけ、なぜか毎回8秒も待たされる。

**修正箇所：** バグは **2箇所** ある。

```
pkg/server/handler/setting.go（ルーティング）
  └─ pkg/server/handler/battle.go の EnemyAttack()  ← ここも確認！
       └─ pkg/server/service/battle.go の EnemyAttack()  ← ここも確認！
```

**ヒント：** サービス層とハンドラー層の両方を確認しよう。ボスドラゴンのときだけ実行される処理がないか？

**クリア判定：** ボスの攻撃がすぐ返ってくればOK。curl でも確認できる：

```bash
curl -X POST http://localhost:8080/api/battle/enemy-attack \
  -H "Content-Type: application/json" \
  -d '{"enemy_attack": 50, "enemy_name": "ボスドラゴン", "hero_hp": 100}'
```

**体験できること：** サービス層とハンドラー層をまたいだデバッグ

---

## Lv6：姿の見えない敵

**症状：** ステルスGopherを偵察しても、名前もHPも「？？？」のまま何も見えない（APIのJSONが空っぽ `{}` で返ってくる）。

**修正箇所：** `pkg/server/service/stealth.go` の `ScoutedEnemy`

**ヒント：**
- Goでは**大文字で始まる名前だけがパッケージの外から見える**（公開される）
- フィールドが小文字だと `encoding/json` からも見えず、JSONに出力されない
- フィールド名を大文字にして、jsonタグ（`` `json:"name"` ``）でJSONでのキー名を指定しよう

**クリア判定：** チャレンジで偵察結果に名前・HP・攻撃力が表示されればOK。

**体験できること：** 大文字/小文字による公開・非公開、structのjsonタグ

---

## Lv7：鏡の鎧を打ち破れ

**症状：** 鏡の鎧のGopherに何度攻撃しても、HPが90のまま1も減らない。攻撃はすべて「鏡に映ったコピー」に吸われている。

**修正箇所：** `pkg/server/service/mirror.go` の `TakeDamage`

**ヒント：**
- `func (k MirrorKnight) TakeDamage(...)` は**値レシーバ**。メソッドが受け取るのは本体の**コピー**で、コピーのHPを減らしても本体は変わらない
- 本体を変更したいメソッドは**ポインタレシーバ** `func (k *MirrorKnight)` にする

**クリア判定：** チャレンジで3回の攻撃後にHPが 90 → 0 になればOK。

**体験できること：** 値レシーバとポインタレシーバの違い、Goの値渡しの基本

---

## Lv8：戦利品を袋に詰めろ

**症状：** 倒した敵から戦利品を拾おうとすると、サーバーがエラーを起こす（panic）。

**修正箇所：** `pkg/server/service/loot.go` の `CollectLoot`

**ヒント：**
- `var bag map[string]int` は宣言しただけで **nil**（袋そのものが存在しない）
- nil の map は「読む」のは安全だが「**書き込むと panic**」する
- `make(map[string]int)` で袋を用意してから詰めよう

**クリア判定：** チャレンジで戦利品（薬草×2 金貨×3 魔石×1）が表示されればOK。

**体験できること：** nil map の罠、`make` による初期化

---

## Lv9：巨神Gopherを検分せよ

**症状：** 25ダメージ×30回＝750のはずが、合計ダメージが **-18** になっている。巨神がむしろ元気になっていないか？

**修正箇所：** `pkg/server/service/titan.go` の `ChallengeTitan`

**ヒント：**
- 合計を `int8` で数えている。int8 に入るのは **-128〜127** だけ
- 範囲を超えると値がぐるっと一周する（オーバーフロー）。Goは実行時に警告してくれない
- 普通に数えるなら `int` を使おう

**クリア判定：** チャレンジで合計ダメージが 750 になればOK。

**体験できること：** Goの整数型（int8/int16/int32/int/…）と値の範囲、オーバーフロー

---

## Lv10：不死身の呪いを解け

**症状：** 致死ダメージを受けてもHPが1残って死なない（GAME OVERにならない）。チャレンジ「不死身の呪い」で判定できる。

**修正箇所：** `pkg/server/service/battle.go` の `ApplyDamage`

**やること：** いきなりコードを読まず、**テストを書いてバグを見つけよう**。

1. `pkg/server/service/battle_test.go` のテーブルにケースを追加する（HPが残るケース・ちょうど0のケース・致死のケース…）
2. テストを実行して、失敗するケースからバグを特定する

```bash
go test ./pkg/server/service/ -run TestApplyDamage -v
```

3. `ApplyDamage` を修正してテストが通ることを確認する

**クリア判定：** チャレンジで「致死ダメージ後のHP」が0になればOK（テストも全部通ること）。

**体験できること：** テーブル駆動テスト、`go test` の使い方、テストでバグを発見する体験

---

## Lv11：討伐碑に名を刻め

**症状：** 討伐碑に刻んだ敵の名前が「ボ��」のように文字化けしている（文字化けの呪い！）。

**修正箇所：** `pkg/server/service/naming.go` の `EngraveName`

**ヒント：**
- Goの string への `len()` は「文字数」ではなく「**バイト数**」を返す。`s[:5]` も先頭**5バイト**で切る
- 日本語は1文字が3バイトなので、文字のド真ん中でちぎれて壊れる
- `[]rune(name)` に変換すると「1文字＝1要素」になる。runeで数えて切り詰め、`string(...)` で戻そう

**クリア判定：** チャレンジで碑文が「ボスドラゴ」のように正しく5文字で刻まれればOK。

**体験できること：** string と rune と byte の関係、UTF-8と日本語の扱い

---

## Lv12：分身Gopherを見破れ

**症状：** 分身だけを半分の強さに弱体化したはずが、**本体まで一緒に弱くなっている**。本体と分身の区別がつかない！

**修正箇所：** `pkg/server/service/mirage.go` の `ChallengeMirage`

**ヒント：**
- `mirage = body` はコピーではない。スライスは「配列を指す窓」なので、**同じ配列を2つの窓から見ている**状態になる
- 片方への変更はもう片方にも見える
- 独立したコピーが欲しいときは `slices.Clone(body)`（Go 1.21）か `make` + `copy` を使う

**クリア判定：** チャレンジで本体が 50/30/20 のまま、分身だけ 25/15/10 になればOK。

**体験できること：** スライスの内部構造（共有される底配列）、`slices.Clone`

---

## Lv13：討伐隊を整列させろ

**症状：** 討伐隊の隊列を組むたびに、並び順が毎回バラバラになる。烏合の衆だ！

**修正箇所：** `pkg/server/service/formation.go` の `FormBattleLine`

**ヒント：**
- Goの map を `for range` で回す順序は「**毎回ランダム**」と言語仕様で決まっている（うっかり順序に依存したコードを書かせないため）
- 順序が必要なら、取り出した後に自分で並べ替える
- `slices.Sort(line)`（Go 1.21）で文字列スライスを辞書順にソートできる

**クリア判定：** チャレンジで5回隊列を組んで、毎回同じ順序になればOK。

**体験できること：** mapの反復順序がランダムである理由、`slices.Sort`

---

## Lv14：幻のステージの番人

**症状：** チャレンジで存在しないステージに挑むと、サーバーで panic が発生する（サーバーログにスタックトレースが出る）。

**修正箇所：** `pkg/server/repository/stage.go` の `GetByID`

**ヒント：**
- エラーを**握りつぶして `nil, nil` を返している**箇所がある
- 呼び出し側（`ClearStage`）は「エラーがなければ結果は使える」と信じているので、nil のステージを参照して panic する
- エラーはそのまま返すのが基本（`sql.ErrNoRows` が「見つからない」を表す）

**クリア判定：** チャレンジで「番人は静かに首を振った（正しくエラーが返った）」になればOK。

**体験できること：** nil ポインタ参照と panic、エラーを握りつぶす危険性、`sql.ErrNoRows`

**発展：** handler 側で `errors.Is(err, sql.ErrNoRows)` を判定して 404 を返してみよう。

---

## Lv15：宝物庫の扉を閉めろ

**症状：** 盗賊Gopherが宝物庫を覗くたびに、扉（DB接続）が開きっぱなしになりどんどん溜まっていく。8回覗くと接続が8個増える。

**修正箇所：** `pkg/server/repository/enemy.go` の `PeekVault`

**ヒント：**
- `db.Query` が返す `rows` は、使い終わったら **Close** しないとDB接続が返却されない
- 今回は先頭の1件だけ見て早めに `return` しているため、自動クローズも効かない
- Goの作法は「リソースを取得したら、**その直後に `defer rows.Close()`**」。return がどこにあっても必ず閉まる

**クリア判定：** チャレンジで8回覗いても接続の増加が +0 ならOK。

⚠️ バグ状態でリークした接続はサーバーを再起動するまで戻らない。再挑戦を繰り返してゲームが不調になったら `Ctrl+C` → `make start` で再起動しよう（それ自体がリークの怖さの体験でもある）。

**体験できること：** `defer` によるリソース解放、`rows.Close()`、コネクションリーク

---

## Lv16：封印を並列に解いてボスと戦う

**症状：** チャレンジで封印解除を試みると、5秒かかって「封印解除に失敗！」と表示される（制限時間3秒）。5つの封印を1つずつ順番に解いているためだ。

**修正箇所：** `pkg/server/service/seal.go` の `BreakAllSeals`

**ヒント：**
- 各封印は解くのに1秒かかる。**5つを並列に解けば約1秒**で終わる
- `go func(...)` でgoroutineを起動し、`sync.WaitGroup` の `Add` / `Done` / `Wait` で全員の完了を待つ
- `results[i]` への書き込みはインデックスが分かれているので競合しない

**クリア判定：** チャレンジで5つの封印がすべて「解いた！」になればOK。

**体験できること：** goroutine、sync.WaitGroup、並列処理による高速化

---

## Lv17：ゴブリンの群れを一掃せよ

**症状：** チャレンジで100体を同時討伐すると、討伐数が「16/100」のようにズレる。

**修正箇所：** `pkg/server/service/horde.go` の `SlayHorde`

**ヒント：**
- 100個のgoroutineが、カウンタ `killCount` を**保護なしで同時に読み書き**している（データ競合 / Race Condition）
- まず検出してみよう：

```bash
go test -race ./...
```

- `sync.Mutex` の `Lock` / `Unlock` でカウンタへのアクセスを守る（`sync/atomic` でもよい）

**クリア判定：** チャレンジで「討伐数 100/100」になればOK。`go test -race ./...` も通ること。

**体験できること：** データ競合（Race Condition）、`go test -race`、`sync.Mutex`

---

## Lv18：ボスの詠唱を中断せよ

**症状：** チャレンジで詠唱中断を試みると、サーバーが10秒間固まって間に合わない。

**修正箇所：** `pkg/server/service/spell.go` の `InterruptCast`

**ヒント：**
- 今は詠唱完了の channel を `<-castSpell()` で**ただ待っているだけ**
- `select` を使うと「複数のchannelのうち先に来た方」を選べる
- `time.After(2 * time.Second)` は「2秒後に届くchannel」を返す。詠唱完了とどちらが先か競わせよう

**クリア判定：** チャレンジで2秒以内に「詠唱を中断させた！」になればOK。

**体験できること：** channel、`select`、`time.After` によるタイムアウト制御

---

## Lv19：ギルドの依頼を同時にこなせ

**症状：** チャレンジで3つの依頼調査が1件ずつ直列に走り（計3秒）、ギルドの受付時間（2秒）に間に合わない。

**修正箇所：** `pkg/server/service/quest.go` の `GatherQuestReports`

**ヒント：**
- Lv16と同じ並列化だが、今回は**エラーを返す関数**を並列にする。`sync.WaitGroup` ではエラーを集められない
- `errgroup.Group` の `Go` / `Wait` を使うと「どれか1件でも失敗したら全体をエラーにする」が書ける。まず導入から：

```bash
go get golang.org/x/sync/errgroup
```

- Go 1.22 以降はループ変数をそのままクロージャで使ってよい（イテレーションごとに別変数になる）

**クリア判定：** チャレンジで3つの依頼がすべて「完了！」になればOK（約1秒）。

**体験できること：** `errgroup` によるエラー付き並列処理、Go 1.22 のループ変数セマンティクス

---

## Lv20：眠るギルドに見切りをつけろ

**症状：** 遠方のギルド（居眠り中）へ伝令を送ると、返事を**永遠に待ち続けて**帰ってこない。

**修正箇所：** `pkg/server/service/courier.go` の `SendCourier`

**ヒント：**
- `http.Client{}` はデフォルトで**タイムアウトなし**。相手が応答しなければ永遠に待つ
- `http.Client{Timeout: 2 * time.Second}` を設定すると、2秒で `client.Get` がエラーを返す
- 外部APIを呼ぶときにタイムアウトを設定するのは実務の鉄則

**クリア判定：** チャレンジで伝令が約2秒で見切りをつけて帰還すればOK。

**体験できること：** `http.Client` でのHTTPリクエスト、タイムアウト設定の重要性

---

## Lv21：城門の大渋滞を制圧せよ

**症状：** 100人の騎士が一斉に突撃して、狭い城門（同時5人まで）に**同時100人**が殺到し大渋滞になっている。

**修正箇所：** `pkg/server/service/assault.go` の `LaunchAssault`

**ヒント：**
- goroutineを起動するのは簡単だが、**同時実行数を制限しない**とリソースが溢れる（実務ではDB接続や外部APIの制限を守るのに必須）
- **バッファ付きchannelをセマフォ（入場券）として使う**のがGoの定番パターン：

```go
sem := make(chan struct{}, 5)
sem <- struct{}{} // 入場券を取る（満員なら空くまで待つ）
<-sem             // 入場券を返す
```

**クリア判定：** チャレンジで同時突撃数の最大が 5/5 以下ならOK。

**体験できること：** バッファ付きchannel、セマフォパターンによる同時実行数の制限

---

## Lv22：悪霊の門を閉じろ

**症状：** チャレンジ「悪霊の門」（30連戦してgoroutineの増加を観測）で、悪霊（goroutine）が30体漏れ出す。

**修正箇所：** `pkg/server/service/battle.go` の `summonSpirit`

**ヒント：**
- 敵の攻撃のたびに「**閉じられることのないchannelを待ち続けるgoroutine**」が起動されている
- goroutine はGCでは回収されない。終了させる手段のないgoroutineは永遠に残る（goroutineリーク）
- 観測してみよう：

```bash
curl http://localhost:8080/api/debug/memory   # num_goroutine に注目
```

- 対処は「そもそも起動しない」か「channel を close して解放する」

**クリア判定：** チャレンジで30連戦してもgoroutineがほぼ増えなければOK。

**体験できること：** goroutineリーク、goroutineのライフサイクル、`runtime.NumGoroutine`

---

## Lv23：倒した敵の怨念を祓え

**症状：** 戦うたびにバトル画面右上の「サーバーメモリ」が増え続ける。チャレンジ「怨念祓いの儀式」（20連戦→メモリ50MB未満なら成功）に失敗する。

**修正箇所：** `pkg/server/service/battle.go` の `HeroAttack` 周辺

**ヒント：**
- グローバル変数に**参照が残り続けるデータをappend**している。GCは「どこからも参照されていないメモリ」しか回収できない
- 観測してから直そう：

```bash
curl http://localhost:8080/api/debug/memory      # heap_alloc_mb に注目
GODEBUG=gctrace=1 make start                     # GCの動きをログで見る
```

- リーク箇所を削除したら、**サーバーを再起動**して確認（溜まった分は再起動でしか消えない）

**クリア判定：** チャレンジ「怨念祓いの儀式」が成功すればOK。

**体験できること：** GCの仕組み、メモリリーク、`runtime.MemStats`、`GODEBUG=gctrace=1`

**発展：** `net/http/pprof` を導入して `go tool pprof` でヒーププロファイルを取ってみよう。

---

## Lv24：使い魔を家に帰せ

**症状：** 使い魔を10体召喚すると、仕事が終わっても**全員帰らずに永遠に働き続ける**（goroutineが増えたまま）。

**修正箇所：** `pkg/server/service/familiar.go`

**ヒント：**
- Lv22の悪霊は「そもそも呼ばない」で解決したが、今回は**働いてもらった後に止めたい**
- goroutineに「もう帰っていいよ」と伝える標準の道具が **context**：
  1. `ctx, cancel := context.WithCancel(context.Background())` で合図付きのctxを作る
  2. 使い魔（goroutine）はループ内の `select` で `<-ctx.Done()` を確認し、合図が来たら `return`
  3. 仕事が終わったら `cancel()` を呼んで全員に合図を送る

**クリア判定：** チャレンジで召喚後に帰らない使い魔が +0 体ならOK。

**体験できること：** `context.WithCancel`、goroutineのライフサイクル管理、`select` + `ctx.Done()`

---

## Lv25：呪いの爆弾を解除せよ

**症状：** チャレンジで解除を試みると、1秒後に**サーバーごと落ちる**（`make start` の air が自動で再起動してくれる）。

**修正箇所：** `pkg/server/service/curse.go` の `DefuseCurse`

**ヒント：**
- Echo には Recover ミドルウェアが入っているのに、なぜ落ちる？——Recover が守れるのは**リクエストを処理しているgoroutineだけ**
- 自分で `go func()` したgoroutineの中の panic は誰も拾えず、プロセス全体が死ぬ
- goroutineの先頭で `defer` + `recover()` を仕込んで爆発を受け止めよう

**クリア判定：** チャレンジで「爆発を受け止めた！サーバーは無事だ！」になればOK。

**体験できること：** panic / recover、goroutine内のpanicがプロセスを殺すこと、Recoverミドルウェアの守備範囲

---

## Lv26：討伐報告書を高速化せよ

**症状：** チャレンジで40000行の討伐記録をまとめると数秒かかり、軍記官が音を上げる（制限時間1秒）。

**修正箇所：** `pkg/server/service/battle.go` の `BuildBattleReport`

**ヒント：**
- 文字列の `+=` 連結は**毎回新しい文字列を丸ごと作り直す**ため、行数が増えると急激に遅くなる
- `strings.Builder` の `WriteString` / `String` を使うと1回のバッファ構築で済む
- ベンチマークで前後を計測すると差が実感できる（`B/op`＝メモリ確保量に注目）：

```bash
go test ./pkg/server/service/ -bench BuildBattleReport -benchmem
```

**クリア判定：** チャレンジで報告書が1秒以内（実際は数ms）に完成すればOK。

**体験できること：** 文字列連結のコスト、`strings.Builder`、`go test -bench` / `-benchmem`

---

## Lv27：古文書を速読せよ

**症状：** ステージ選択画面の「言い伝え」の表示が毎回遅い（800ms）。チャレンジ「古文書の速読」でも2回目の解読すら一瞬で終わらない。解読結果は変わらないのに、毎回解読し直しているためだ。

**修正箇所：** `pkg/server/service/ancient.go` の `DecodeAncientText`

**ヒント：**
- 「最初の1回だけ実行して、2回目以降は結果を使い回す」には `sync.Once` の `Do` が使える
- `sync.Once` は並行に呼ばれても中の関数を必ず1回しか実行しない（2回目以降は完了を待って即返る）

**クリア判定：** チャレンジで2回目の解読が一瞬（200ms未満）ならOK。「言い伝え」の表示も2回目から速くなる。

**体験できること：** `sync.Once`、一度きりの初期化（遅延初期化）

---

## Lv28：予言者に打ち勝て

**症状：** チャレンジで予言者に**会心の一撃の行方を12回すべて予知されてしまう**。乱数が予測可能＝チートし放題ということだ。

**修正箇所：** `pkg/server/service/battle.go` の `RollCritical`

**ヒント：**
- 古い `math/rand` を**固定シード**で使っているため、乱数列が完全に再現できてしまう（予言者は同じシードで「未来」を再現している。`pkg/server/service/prophecy.go` を覗いてみよう）
- Go 1.22 の `math/rand/v2` は自動でシードされ、`rand.IntN(4)` のようにトップレベル関数がそのまま使える
- `criticalRolls++` の行は予言者の判定用なので残すこと

**クリア判定：** チャレンジで「予言が外れた！」になればOK。curl でも確認できる：

```bash
# 修正前は all_match: true、修正後は false
curl -X POST http://localhost:8080/api/battle/prophecy
```

**体験できること：** `math/rand/v2`（Go 1.22）、シードと乱数の予測可能性、v1→v2 移行

---

# 発展課題

クリアしたら好きなものに挑戦しよう。

| カテゴリ | チャレンジ例 |
|---------|------------|
| テスト | Integration Test, E2E Test, TDD, BDD, カバレッジ80% |
| DB | Redis, Index追加, Migration, N+1解消, Transaction |
| アーキテクチャ | クリーンアーキテクチャ, DDD, デザインパターン, DI |
| Go深掘り | context伝播, Graceful Shutdown, slog, ジェネリクス, slices, testing/synctest, コネクションプール, go:embed |
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
