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
│       │   ├── stage.go       # ステージ関連API（Lv2バグ箇所）
│       │   └── battle.go      # バトル関連API（Lv4, Lv5バグ箇所）
│       ├── service/
│       │   ├── hero.go        # Hero struct + リクエスト型
│       │   ├── stage.go       # Stage struct + レスポンス型
│       │   ├── enemy.go       # Enemy struct
│       │   ├── battle.go      # ダメージ計算（Lv1, Lv5, Lv7バグ箇所）
│       │   ├── battle_test.go # Lv7 スターターテスト
│       │   └── seal.go        # 封印解除（Lv6バグ箇所）
│       └── repository/
│           ├── hero.go        # HeroRepository（DB操作）
│           ├── stage.go       # StageRepository（DB操作）
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
