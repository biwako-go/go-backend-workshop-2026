# Gopher Slayer

Go バックエンド開発を体験するワークショップ用ゲームです。
全体の構造は [ARCHITECTURE.md](ARCHITECTURE.md) を参照してください。
タスクは [Tasks.md](Tasks.md) を参照してください。

## ディレクトリ構成

```
cmd/main.go              # エントリポイント
pkg/server/
  handler/               # HTTPリクエストの受け取りとレスポンスの返却
    setting.go           # ルーティング
  service/               # 型定義とビジネスロジック
  repository/            # DB操作
db/init/                 # DBの初期化SQL
_frontend/               # ゲーム画面（参加者は触らない）
```

## 前提

- **Go 1.25 以上**（Lv23 の `testing/synctest` に必要）
- Docker

## 起動

```bash
# air のインストール（初回のみ）
make setup

# DB 起動
make up

# アプリ起動（ファイル保存で自動リロード）
make dev
```

http://localhost:8080 でゲームが開きます。

## 停止

```bash
# アプリ: Ctrl+C

# DB を止める
make down

# DB のデータごと消す（リセット）
make reset
```

## その他のコマンド

```bash
make test    # テスト実行
make race    # データ競合の検出（Lv8）
make bench   # ベンチマーク（Lv13）
```

## トラブルシューティング

**DB に接続できない**

DB の起動が間に合っていない可能性があります。少し待ってから再実行してください。
それでも失敗する場合はコンテナをリセットします。

```bash
make reset
make up
```

**ポート 3307 が使用中**

`docker-compose.yaml` のポート番号を変更し、環境変数 `DB_PORT` を合わせてください。

```yaml
# docker-compose.yaml
ports:
  - "3308:3306"  # 例: 3308 に変更
```

```bash
DB_PORT=3308 go run ./cmd/main.go
```

**ポート 8080 が使用中**

環境変数 `PORT` を指定して起動してください。

```bash
PORT=8081 go run ./cmd/main.go
```
