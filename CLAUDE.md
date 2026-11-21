# Gopher Slayer

## 目的

GoでHTTP APIを作る体験を、ゲームのバグ修正というかたちで提供するワークショップ教材。
参加者はGoもAPIも触ったことがない初心者を想定する。

## コンセプト

- **「動かないゲームを直す」** という体験形式にすることで、何を直せばいいかが明確になる
- コードを読んでバグを見つけ → 修正する → ゲームが動く、という成功体験を繰り返す
- Lv1〜Lv3は誰でも完走できる難易度。Lv4以降は応用。Lv6〜Lv42はGo経験者向けで、Goの基本の罠→データ構造→DB/エラー→並行処理→性能→最新Go の順に難易度・依存関係で並べてある。最後の Lv29〜Lv42 は「最新のGo」編で、Lv29〜Lv33 は Go 1.23〜1.27 の新機能を1バージョン1レベルでたどり（Lv28 の math/rand/v2 = Go 1.22 の続き）、Lv34〜Lv36 は Go 1.26〜1.27 の2周目、Lv37〜Lv42 は Go 1.25〜1.27 を2レベルずつの3周目
- ステージ（Lv1〜5）の解放はDBのEXPが基準。ただし「DB基準で最初に🔒のステージ」1つだけはセッション中に稼いだEXPで先行解放できる（Lv1クリア直後にLv2へ進める。Lv2を直してDBに保存しない限りその先は開かず、リロードでDB基準に戻る）
- レベルはLv1〜Lv42の一本道。Lv6の敵は全ステージクリア（EXP500）で出現し、チャレンジの敵を倒すと **EXP+100**（フロントが `PUT /api/hero/experience` で付与）され次の敵が解放される
- **全レベルが「敵のHPを削って倒す」ゲームUIでクリア判定できる**（Lv1〜5はステージバトル、Lv6〜42はチャレンジの敵とのバトル：カードクリックでエンカウント→**「たたかう」ボタンが判定トリガー**→成功＝攻撃が通ってHP0、失敗＝敵の反撃演出。失敗後はその場で再度たたかえる）。チャレンジの敵（名前/HP/解放EXP）はDBの `challenge_enemies` にあり `GET /api/challenges` で取得、スプライトは `_frontend/images/gopher-enemies/` のみ使用
- **最新Goキャッチアップモード**：ステージ選択画面のボタン（または `/?mode=catchup`）で、Go 1.25〜1.27 の新機能のレベル（Lv31〜Lv42 のうち12レベル）だけを EXP に関係なく挑戦できる。クリアしても EXP は増やさず（本編の進行を壊さないため）、クリア状況はブラウザの localStorage に記録する。対象は `_frontend/game.js` の `ADVANCED_CHALLENGES` の `go`（そのレベルで学ぶ機能のGoバージョン）と `CATCHUP_VERSIONS` で決まる
- UIに馴染まない開発体験系のトピック（Graceful Shutdown、slog、context伝播等）はレベルにせず CHALLENGES.md（発展課題）に置く

## アーキテクチャの方針

### レイヤー構成

```
handler → service → repository → DB
```

- **handler**: HTTPリクエストの受け取りとレスポンスの返却
- **service**: 型定義とビジネスロジック
- **repository**: DB操作（SELECT/INSERT/UPDATE）

### 制約

- 抽象化・インターフェースを使わない（初心者が読めなくなるため）
- コメントは日本語で書く
- バグ仕込み箇所には `[LvN バグ仕込み箇所]` のコメントを必ず残す

## フォルダ構造

```
.
├── api-document.yaml          # API仕様（OpenAPI）
├── cmd/
│   └── main.go                # エントリポイント
├── db/
│   └── init/
│       ├── 1_ddl.sql          # テーブル定義
│       └── 2_dml.sql          # 初期データ
├── pkg/
│   ├── constant/
│   │   └── constant.go        # 環境変数・設定
│   ├── db/
│   │   └── conn.go            # DB接続
│   └── server/
│       ├── server.go          # Echo設定・ハンドラー生成
│       ├── handler/
│       │   ├── setting.go     # ルーティング（Lv3バグ箇所）
│       │   ├── hero.go        # ヒーロー関連API
│       │   ├── stage.go       # ステージ関連API（Lv2バグ箇所）+ 言い伝え/速読/チャレンジ一覧API
│       │   ├── battle.go      # バトル関連API（Lv4, Lv5バグ箇所）+ 各チャレンジ判定API・モックAPI
│       │   ├── quest.go       # ギルド依頼API（Lv19）
│       │   └── debug.go       # メモリ/goroutine観測API（Lv22, Lv23観測用）+ goroutineleak観測API（Lv36観測用）・変更不要
│       ├── service/
│       │   ├── hero.go / stage.go / enemy.go  # struct定義（enemy.go に ChallengeEnemy も）
│       │   ├── battle.go      # ダメージ計算（Lv1, Lv5, Lv22, Lv23, Lv26, Lv28バグ箇所）
│       │   ├── undead.go      # 不死のゾンビ（Lv10バグ箇所）+ undead_test.go スターター
│       │   ├── report_bench_test.go # Lv26 スターターベンチマーク
│       │   ├── stealth.go     # 偵察（Lv6） / mirror.go 鏡の鎧（Lv7） / loot.go 戦利品（Lv8）
│       │   ├── titan.go       # 巨神（Lv9） / naming.go 討伐碑（Lv11） / mirage.go 分身（Lv12）
│       │   ├── formation.go   # 隊列（Lv13） / seal.go 封印（Lv16） / horde.go 群れ（Lv17）
│       │   ├── horde_test.go  # Lv17 race検出用テスト（-race時のみ失敗）
│       │   ├── spell.go       # 詠唱中断（Lv18） / quest.go ギルド依頼（Lv19）
│       │   ├── courier.go     # 伝令（Lv20） / assault.go 突撃（Lv21） / familiar.go 使い魔（Lv24）
│       │   ├── curse.go       # 呪いの爆弾（Lv25） / ancient.go 古文書（Lv27）
│       │   ├── prophecy.go    # 予言者（Lv28の判定用・変更不要）
│       │   ├── march.go       # 骸骨兵の行進（Lv29） / library.go 禁書庫（Lv30） / reinforce.go 援軍（Lv31）
│       │   ├── barrier.go     # 結界（Lv32） / forgery.go 偽造された請求書（Lv33）
│       │   ├── appraise.go    # 鑑定書（Lv34） / roster.go 冒険者名簿（Lv35） / pigeon.go 伝書鳩（Lv36）
│       │   ├── oldmap.go      # 宝の地図（Lv37） / treasury.go 金庫の窓口（Lv38） / fortress.go 砦への伝令（Lv39）
│       │   └── chronicle.go   # 戦闘記録（Lv40） / decree.go 王の勅書（Lv41） / satchel.go 道具袋（Lv42）
│       └── repository/
│           ├── hero.go        # HeroRepository（DB操作）
│           ├── stage.go       # StageRepository（DB操作・Lv14バグ箇所）
│           └── enemy.go       # EnemyRepository（DB操作・Lv15バグ箇所 + challenge_enemies取得）
├── _frontend/                 # ゲーム画面（参加者は触らない）
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── images/
├── docker-compose.yaml
├── Makefile
├── README.md                  # 起動方法のみ
├── ARCHITECTURE.md            # 全体構造・API一覧・ER図（参加者向けの地図）
├── Tasks.md                   # ワークショップタスク（参加者向け）
├── ANSWER.md                  # 答え合わせ（講師向け）
└── CHALLENGES.md              # 発展課題一覧
```

## バグ仕込み箇所一覧

| Lv | ファイル | 修正内容 |
|----|---------|---------|
| Lv1 | `pkg/server/service/battle.go` の `CalculateDamage` | `return 0` → `return attack` |
| Lv2 | `pkg/server/handler/stage.go` の `ClearStage` | `heroRepo.UpdateExperience()` の呼び出しを削除 |
| Lv3 | `pkg/server/handler/setting.go` の `RegisterRoutes` | `api.PUT("/hero/hp", ...)` をコメントアウト |
| Lv4 | `pkg/server/handler/battle.go` の `Attack` | デーモンへのヒーロー攻撃ダメージを反転 |
| Lv5 | `pkg/server/service/battle.go` の `EnemyAttack`（3s）+ `handler/battle.go` の `EnemyAttack`（5s） | ボスドラゴンのみ `time.Sleep` を追加 |
| Lv6 | `pkg/server/service/stealth.go` | フィールドが小文字＝非公開でJSONが空になる（大文字化＋jsonタグが正解）。判定 `POST /api/battle/scout` |
| Lv7 | `pkg/server/service/mirror.go` の `TakeDamage` | 値レシーバでHPが減らない（ポインタレシーバが正解）。判定 `/battle/mirror` |
| Lv8 | `pkg/server/service/loot.go` の `CollectLoot` | nil map への書き込みで panic（make が正解）。判定 `/battle/loot` |
| Lv9 | `pkg/server/service/titan.go` の `ChallengeTitan` | 合計を int8 で数えてオーバーフロー（int が正解）。判定 `/battle/titan` |
| Lv10 | `pkg/server/service/undead.go` の `FinishingBlow` | 致死ダメージ時に `return 1`（正しくは `return 0`）。undead_test.go で発見する想定。判定 `/battle/finish`。通常バトルの `ApplyDamage` は最初から正しく、HP0でGAME OVER→全回復が全Lvで機能する |
| Lv11 | `pkg/server/service/naming.go` の `EngraveName` | `s[:5]` のバイト切断で日本語名が文字化け（[]rune が正解）。判定 `/battle/engrave` |
| Lv12 | `pkg/server/service/mirage.go` の `ChallengeMirage` | スライス代入で配列を共有し本体まで弱体化（slices.Clone が正解）。判定 `/battle/mirage` |
| Lv13 | `pkg/server/service/formation.go` の `FormBattleLine` | map の range 順序がランダムで隊列が毎回変わる（slices.Sort が正解）。判定 `/battle/formation` |
| Lv14 | `pkg/server/repository/stage.go` の `GetByID` | エラー握りつぶしで `nil, nil` を返す → 呼び出し側で nil panic（`return nil, err` が正解） |
| Lv15 | `pkg/server/repository/enemy.go` の `PeekVault` | rows.Close 忘れでDB接続がリーク（defer rows.Close() が正解）。判定 `/battle/vault`（8回覗いて db.Stats 比較。バグ状態の連打でMySQL接続が枯渇しうるため回数は8に抑制） |
| Lv16 | `pkg/server/service/seal.go` の `BreakAllSeals` | 封印を順番に解く（goroutine + WaitGroup で並列化が正解） |
| Lv17 | `pkg/server/service/horde.go` の `SlayHorde` | mutex なしで `killCount` に並行書き込み（sync.Mutex が正解） |
| Lv18 | `pkg/server/service/spell.go` の `InterruptCast` | 詠唱channelを10秒待つだけ（select + time.After で2秒タイムアウトが正解） |
| Lv19 | `pkg/server/service/quest.go` の `GatherQuestReports` | 依頼調査が直列3秒（errgroup で並列化が正解。x/sync は参加者が go get する） |
| Lv20 | `pkg/server/service/courier.go` の `SendCourier` | http.Client の Timeout 未設定で眠るモックAPIを待ち続ける（Timeout: 2s が正解）。判定 `/battle/courier`、相手役 `GET /api/mock/guild` |
| Lv21 | `pkg/server/service/assault.go` の `LaunchAssault` | 100 goroutine 一斉突撃で同時実行数が無制限（バッファ付きchannelのセマフォで5に制限が正解）。判定 `/battle/assault`（ピーク同時数カウンタ） |
| Lv22 | `pkg/server/service/battle.go` の `summonSpirit` | 閉じない channel を待つ goroutine をリクエスト毎に起動（呼び出し削除が正解） |
| Lv23 | `pkg/server/service/battle.go` の `HeroAttack` | グローバル `grudges` に5MBずつ append するメモリリーク（削除が正解） |
| Lv24 | `pkg/server/service/familiar.go` の `summonOne` | 停止手段のない無限ループ goroutine を10体召喚（context.WithCancel + select が正解）。判定 `/battle/familiars` |
| Lv25 | `pkg/server/service/curse.go` の `DefuseCurse` | goroutine 内で panic → サーバーごと落ちる（defer + recover が正解） |
| Lv26 | `pkg/server/service/battle.go` の `BuildBattleReport` | `+=` の文字列連結（strings.Builder 化が正解）。判定 `/battle/report`（40000行を1秒以内） |
| Lv27 | `pkg/server/service/ancient.go` の `DecodeAncientText` | 毎回800msの解読をやり直す（sync.Once が正解）。判定 `/api/legend/speedread` |
| Lv28 | `pkg/server/service/battle.go` の `RollCritical` | 固定シードの math/rand v1（math/rand/v2 への移行が正解）。判定 `/battle/prophecy`（`service/prophecy.go` が固定シード列との部分一致を検査。判定回数のカウント不要） |
| Lv29 | `pkg/server/service/march.go` の `SkeletonMarch` | range-over-func イテレータ（Go 1.23）が yield の戻り値を無視 → 呼び出し側の break 後も yield して panic（`if !yield(s) { return }` が正解）。判定 `/battle/march`（ハンドラーが panic を recover して画面に返す） |
| Lv30 | `pkg/server/service/library.go` の `LendScroll` | 名前をそのまま filepath.Join してパストラバーサル（os.OpenRoot（Go 1.24）+ root.ReadFile（Go 1.25）が正解）。判定 `/battle/library`（一時ディレクトリに書庫・禁書庫・外を指す symlink を作り、`../` と symlink の両方を検査。IsLocal だけでは symlink が通る） |
| Lv31 | `pkg/server/service/reinforce.go` の `MusterReinforcements` | wg.Add(1) を goroutine の中で呼び Wait が先に終わる（wg.Go（Go 1.25）が正解。`go vet ./...` が検出）。判定 `/battle/reinforce`（バグでも1割ほど偶然揃うため10回出陣して全回10部隊を要求） |
| Lv32 | `pkg/server/service/barrier.go` の `BreakBarriers` | %w でラップされたエラーに型アサーション（errors.AsType（Go 1.26）が正解。errors.As でも可）。判定 `/battle/barrier` |
| Lv33 | `pkg/server/service/forgery.go` の `ReadRewardClaim` | encoding/json v1 の大文字小文字無視・重複キー後勝ちで偽造請求書に99999G払う（import を encoding/json/v2（Go 1.27）にするのが正解）。判定 `/battle/forgery` |
| Lv34 | `pkg/server/service/appraise.go` の `AppraiseTreasures` | ループ外の変数 bonus を使い回して `&bonus` を渡し、全部の宝のボーナスが同じ値になる（`new(t.value * 2)`（Go 1.26）が正解。ループ内で宣言しても可）。判定 `/battle/appraise` |
| Lv35 | `pkg/server/service/roster.go` の `IssueAdventurerID` | 時刻（ミリ秒）をそのまま登録番号にして重複する（`uuid.NewV7()`（Go 1.27 の標準 uuid パッケージ）が正解）。判定 `/battle/roster`（100件の重複なし＋文字列順＝登録順。v4 の `uuid.New()` は順序で失敗する） |
| Lv36 | `pkg/server/service/pigeon.go` の `SendPigeons` | タイムアウト後に受け取り手のいないバッファなし channel へ送信して goroutine リーク（バッファ付きにするのが正解）。判定 `/battle/pigeons`（Go 1.27 の goroutineleak プロファイルで service 内の漏れの増分を数える。出発200ms未満も要求） |
| Lv37 | `pkg/server/service/oldmap.go` の `ReadTreasureMap` | os.Open の err を確かめる前に f.Name() を呼び、存在しない地図で nil pointer panic（err を先に確かめるのが正解）。Go 1.21〜1.24 はコンパイラのバグで panic しないことがあり、Go 1.25 で正しく panic するようになった題材。判定 `/battle/oldmap`（ハンドラーが panic を recover して画面に返す） |
| Lv38 | `pkg/server/service/treasury.go` の `NewTreasuryHandler` | 別サイトからの送金（CSRF）を通してしまう（`http.NewCrossOriginProtection().Handler(mux)`（Go 1.25）が正解）。判定 `/battle/treasury`（httptest で同じサイト / 別サイト / ヘッダーなしの3通り。全部止めると失敗） |
| Lv39 | `pkg/server/service/fortress.go` の `FortressStatusURL` | `"%s:%d"` で IPv6 のホストを角かっこなしでつなぎ、Go 1.26 の net/url（urlstrictcolons）で読めない（net.JoinHostPort が正解）。判定 `/battle/fortress`（url.Parse でホストとポートを検査。通信はしない） |
| Lv40 | `pkg/server/service/chronicle.go` の `RecordBattle` | logger を2つ作って毎回両方に書き、討伐だけ監査用に書き忘れ（`slog.NewMultiHandler`（Go 1.26）で1つの logger にまとめるのが正解）。判定 `/battle/chronicle`（テキストとJSONの両方で討伐3件） |
| Lv41 | `pkg/server/service/decree.go` の `ReadDecree` | strings.Cut で最初の「--」で切り、本文に「--」を含む本物の勅書を偽物と判定（`strings.CutLast`（Go 1.27）が正解）。判定 `/battle/decree` |
| Lv42 | `pkg/server/service/satchel.go` の `Take` / `DrinkPotions` | any で返して `.(Potion)` と決め打ちし、爆弾で panic（ジェネリックメソッド `Take[T any](name) (T, bool)`（Go 1.27）が正解。呼び出し側の comma-ok でも可）。判定 `/battle/satchel`（ハンドラーが panic を recover して画面に返す） |

観測用API（正しいコードで、参加者は変更しない）: `GET /api/debug/memory`（Lv23 メモリ / Lv22 goroutine 数）、`GET /api/debug/goroutineleak`（Lv36 漏れた goroutine のスタック）— `pkg/server/handler/debug.go`。
判定用コード（変更しない）: `pkg/server/service/prophecy.go`（Lv28）、各 `/battle/*` 判定ハンドラー（`handler/battle.go`）、`GET /api/mock/guild`（Lv20の相手役）。
go.mod は Go 1.27（Lv29〜Lv42 の新機能に必要。go test が走らせる vet の stdversion チェックがあるため、新しい標準APIを使う修正をするなら go.mod もそれ以上である必要がある）。x/sync は Lv19 で参加者が go get する。

## DB構成

MySQL 8.0。テーブルは4つ。

```
heroes            id / name / hp / max_hp / attack / level / experience
stages            id / name / description / required_experience / order_num
enemies           id / stage_id / name / hp / max_hp / attack / experience_reward
challenge_enemies id / action / name / hp / max_hp / attack / unlock_exp   ← Lv6〜Lv42の敵
```

ヒーローは常にid=1の1件のみ。challenge_enemies の action はフロントのチャレンジ種別キー。

## 起動

```bash
docker compose up -d db
make start
```

詳細は [README.md](README.md) を参照。
