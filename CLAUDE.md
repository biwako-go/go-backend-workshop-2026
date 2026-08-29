# Gopher Slayer

## 目的

GoでHTTP APIを作る体験を、ゲームのバグ修正というかたちで提供するワークショップ教材。
参加者はGoもAPIも触ったことがない初心者を想定する。

## コンセプト

- **「動かないゲームを直す」** という体験形式にすることで、何を直せばいいかが明確になる
- コードを読んでバグを見つけ → 修正する → ゲームが動く、という成功体験を繰り返す
- Lv1〜Lv3は誰でも完走できる難易度。Lv4以降は応用。Lv5〜Lv7はGo経験者向け

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
│       │   ├── stage.go       # ステージ関連API（Lv2バグ箇所）+ 言い伝えAPI
│       │   ├── battle.go      # バトル関連API（Lv4, Lv5バグ箇所）
│       │   ├── quest.go       # ギルド依頼API（Lv16）
│       │   └── debug.go       # メモリ/goroutine/DBプール観測API（Lv9, Lv17, Lv24観測用・変更不要）
│       ├── service/
│       │   ├── hero.go        # Hero struct + リクエスト型
│       │   ├── stage.go       # Stage struct + レスポンス型
│       │   ├── enemy.go       # Enemy struct
│       │   ├── battle.go      # ダメージ計算（Lv1, Lv5, Lv7, Lv9, Lv13, Lv17, Lv20バグ箇所）
│       │   ├── battle_test.go # Lv7 スターターテスト
│       │   ├── report_bench_test.go # Lv13 スターターベンチマーク
│       │   ├── seal.go        # 封印解除（Lv6バグ箇所）
│       │   ├── horde.go       # 群れ討伐（Lv8バグ箇所）
│       │   ├── horde_test.go  # Lv8 race検出用テスト（-race時のみ失敗）
│       │   ├── spell.go       # 詠唱中断（Lv11, Lv23バグ箇所）
│       │   ├── spell_test.go  # Lv23 synctest スターター（Skip付き）
│       │   ├── quest.go       # ギルド依頼調査（Lv16バグ箇所）
│       │   ├── curse.go       # 呪いの爆弾（Lv18バグ箇所）
│       │   ├── ancient.go     # 古文書解読（Lv19バグ箇所）
│       │   ├── mathutil.go    # Max関数群（Lv21リファクタ対象）+ mathutil_test.go
│       │   └── ranking.go     # 敵ソート/検索（Lv22リファクタ対象）+ ranking_test.go
│       └── repository/
│           ├── hero.go        # HeroRepository（DB操作）
│           ├── stage.go       # StageRepository（DB操作・Lv10バグ箇所）
│           └── enemy.go       # EnemyRepository（DB操作）
├── _frontend/                 # ゲーム画面（参加者は触らない）
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── images/
├── docker-compose.yaml
├── Makefile
├── README.md                  # 起動方法のみ
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
| Lv6 [ステージ] | `pkg/server/service/seal.go` の `BreakAllSeals` | 封印を順番に解く（goroutine + WaitGroup で並列化が正解） |
| Lv7 [タスク] | `pkg/server/service/battle.go` の `ApplyDamage` | 致死ダメージ時に `return 1`（正しくは `return 0`） |
| Lv8 [ステージ] | `pkg/server/service/horde.go` の `SlayHorde` | mutex なしで `killCount` に並行書き込み（sync.Mutex が正解） |
| Lv9 [ステージ] | `pkg/server/service/battle.go` の `HeroAttack` | グローバル `grudges` に5MBずつ append するメモリリーク（削除が正解） |
| Lv10 [ステージ] | `pkg/server/repository/stage.go` の `GetByID` | エラー握りつぶしで `nil, nil` を返す → 呼び出し側で nil panic（`return nil, err` が正解） |
| Lv11 [ステージ] | `pkg/server/service/spell.go` の `InterruptCast` | 詠唱channelを10秒待つだけ（select + time.After で2秒タイムアウトが正解） |
| Lv12 [タスク] | `cmd/main.go` | Graceful Shutdown 未実装（signal.Notify + e.Shutdown を実装する） |
| Lv13 [タスク] | `pkg/server/service/battle.go` の `BuildBattleReport` | `+=` の文字列連結（strings.Builder 化が正解、ベンチで計測） |
| Lv14 [タスク] | `cmd/main.go`・`pkg/db/conn.go` | `log.Printf` のテキストログ（log/slog の構造化ログに置換する） |
| Lv15 [タスク] | handler / service / repository 全層 | context.Context 未伝播（全層に ctx を通し QueryRowContext 等へ） |
| Lv16 [ステージ] | `pkg/server/service/quest.go` の `GatherQuestReports` | 依頼調査が直列3秒（errgroup で並列化が正解。x/sync は参加者が go get する） |
| Lv17 [ステージ] | `pkg/server/service/battle.go` の `summonSpirit` | 閉じない channel を待つ goroutine をリクエスト毎に起動（呼び出し削除が正解） |
| Lv18 [ステージ] | `pkg/server/service/curse.go` の `DefuseCurse` | goroutine 内で panic → サーバーごと落ちる（defer + recover が正解） |
| Lv19 [タスク] | `pkg/server/service/ancient.go` の `DecodeAncientText` | 毎回800msの解読をやり直す（sync.Once が正解） |
| Lv20 [タスク] | `pkg/server/service/battle.go` の `RollCritical` | 固定シードの math/rand v1（math/rand/v2 への移行が正解） |
| Lv21 [タスク] | `pkg/server/service/mathutil.go` | MaxInt / MaxFloat64 の重複（ジェネリクス Max[T cmp.Ordered] が正解） |
| Lv22 [タスク] | `pkg/server/service/ranking.go` | 手書きバブルソート・検索ループ（slices.SortFunc / ContainsFunc が正解） |
| Lv23 [タスク] | `pkg/server/service/spell.go` の `castSpell` + `spell_test.go` | testing/synctest（Go 1.25）で詠唱テスト。unbuffered channel の goroutineリークを synctest が暴く（バッファ付き channel が正解） |
| Lv24 [タスク] | `pkg/db/conn.go` の `Connect` | コネクションプール未設定（SetMaxOpenConns 等の設定が正解、/api/debug/db で観測） |
| Lv25 [タスク] | `pkg/server/server.go` の静的配信 | ディスク配信（リポジトリ直下に frontend_embed.go を作り go:embed all:_frontend + e.StaticFS が正解） |

Lv12・Lv14・Lv15・Lv24・Lv25 は「現状のコードがそのまま修正前の状態」であり、バグを仕込んでいるわけではない（マーカーコメントのみ）。Lv21・Lv22 はリファクタ課題。
観測用API（正しいコードで、参加者は変更しない）: `GET /api/debug/memory`（Lv9 メモリ / Lv17 goroutine 数）、`GET /api/debug/db`（Lv24 プール統計）— いずれも `pkg/server/handler/debug.go`。
go.mod は Go 1.25（Lv23 の testing/synctest に必要）。

## DB構成

MySQL 8.0。テーブルは3つ。

```
heroes   id / name / hp / max_hp / attack / level / experience
stages   id / name / description / required_experience / order_num
enemies  id / stage_id / name / hp / max_hp / attack / experience_reward
```

ヒーローは常にid=1の1件のみ。

## 起動

```bash
docker compose up -d db
make dev
```

詳細は [README.md](README.md) を参照。
