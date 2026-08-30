# Gopher Slayer

## 目的

GoでHTTP APIを作る体験を、ゲームのバグ修正というかたちで提供するワークショップ教材。
参加者はGoもAPIも触ったことがない初心者を想定する。

## コンセプト

- **「動かないゲームを直す」** という体験形式にすることで、何を直せばいいかが明確になる
- コードを読んでバグを見つけ → 修正する → ゲームが動く、という成功体験を繰り返す
- Lv1〜Lv3は誰でも完走できる難易度。Lv4以降は応用。Lv6〜Lv28はGo経験者向けで、Goの基本の罠→データ構造→DB/エラー→並行処理→性能の順に難易度・依存関係で並べてある
- ステージ（Lv1〜5）の解放はDBのEXPが基準。ただし「DB基準で最初に🔒のステージ」1つだけはセッション中に稼いだEXPで先行解放できる（Lv1クリア直後にLv2へ進める。Lv2を直してDBに保存しない限りその先は開かず、リロードでDB基準に戻る）
- レベルはLv1〜Lv28の一本道。Lv6の敵は全ステージクリア（EXP500）で出現し、チャレンジの敵を倒すと **EXP+100**（フロントが `PUT /api/hero/experience` で付与）され次の敵が解放される
- **全レベルが「敵のHPを削って倒す」ゲームUIでクリア判定できる**（Lv1〜5はステージバトル、Lv6〜28はチャレンジの敵とのバトル：カードクリックでエンカウント→**「たたかう」ボタンが判定トリガー**→成功＝攻撃が通ってHP0、失敗＝敵の反撃演出。失敗後はその場で再度たたかえる）。チャレンジの敵（名前/HP/解放EXP）はDBの `challenge_enemies` にあり `GET /api/challenges` で取得、スプライトは `_frontend/images/gopher-enemies/` のみ使用
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
│       │   └── debug.go       # メモリ/goroutine観測API（Lv22, Lv23観測用・変更不要）
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
│       │   └── prophecy.go    # 予言者（Lv28の判定用・変更不要）
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

観測用API（正しいコードで、参加者は変更しない）: `GET /api/debug/memory`（Lv23 メモリ / Lv22 goroutine 数）— `pkg/server/handler/debug.go`。
判定用コード（変更しない）: `pkg/server/service/prophecy.go`（Lv28）、各 `/battle/*` 判定ハンドラー（`handler/battle.go`）、`GET /api/mock/guild`（Lv20の相手役）。
go.mod は Go 1.22（math/rand/v2 に必要）。x/sync は Lv19 で参加者が go get する。

## DB構成

MySQL 8.0。テーブルは4つ。

```
heroes            id / name / hp / max_hp / attack / level / experience
stages            id / name / description / required_experience / order_num
enemies           id / stage_id / name / hp / max_hp / attack / experience_reward
challenge_enemies id / action / name / hp / max_hp / attack / unlock_exp   ← Lv6〜Lv28の敵
```

ヒーローは常にid=1の1件のみ。challenge_enemies の action はフロントのチャレンジ種別キー。

## 起動

```bash
docker compose up -d db
make start
```

詳細は [README.md](README.md) を参照。
