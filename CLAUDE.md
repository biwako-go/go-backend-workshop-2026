# Gopher Slayer

## 目的

GoでHTTP APIを作る体験を、ゲームのバグ修正というかたちで提供するワークショップ教材。
参加者はGoもAPIも触ったことがない初心者を想定する。

## コンセプト

- **「動かないゲームを直す」** という体験形式にすることで、何を直せばいいかが明確になる
- コードを読んでバグを見つけ → 修正する → ゲームが動く、という成功体験を繰り返す
- Lv1〜Lv3は誰でも完走できる難易度。Lv4以降は応用

## アーキテクチャの方針

### レイヤー構成

```
handler → model → DB
```

service層・repository層は持たない。参加者がコードを追いやすいよう最小構成にする。

- **handler**: HTTPリクエストの受け取りとレスポンスの返却
- **model**: DB操作（SELECT/INSERT/UPDATE）とビジネスロジック

### 制約

- レイヤーを増やさない（service, repositoryは作らない）
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
│       │   └── battle.go      # バトル関連API
│       └── model/
│           ├── hero.go        # Hero struct + DB操作
│           ├── stage.go       # Stage struct + DB操作
│           ├── enemy.go       # Enemy struct + DB操作
│           └── battle.go      # ダメージ計算（Lv1, Lv4バグ箇所）
├── _frontend/                 # ゲーム画面（参加者は触らない）
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── images/
├── docker-compose.yaml
├── Dockerfile
├── Makefile
├── README.md                  # 起動方法のみ
├── Tasks.md                   # ワークショップタスク（参加者向け）
├── ANSWER.md                  # 答え合わせ（講師向け）
└── CHALLENGES.md              # 発展課題一覧
```

## バグ仕込み箇所一覧

| Lv | ファイル | 修正内容 |
|----|---------|---------|
| Lv1 | `pkg/server/model/battle.go` の `CalculateDamage` | `return 0` → `return attack` |
| Lv2 | `pkg/server/handler/stage.go` の `ClearStage` | `model.UpdateHeroExperience()` の呼び出しを削除 |
| Lv3 | `pkg/server/handler/setting.go` の `RegisterRoutes` | `api.PUT("/hero/hp", ...)` をコメントアウト |
| Lv4 | `pkg/server/model/battle.go` の `EnemyAttack` | `time.Sleep` の追加 + ダメージを負にする |

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
docker-compose up -d db
go run ./cmd/main.go
```

詳細は [README.md](README.md) を参照。
