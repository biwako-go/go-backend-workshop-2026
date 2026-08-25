# Gopher Slayer

Go バックエンド開発を体験するワークショップ用ゲームです。
タスクは [Tasks.md](Tasks.md) を参照してください。

## ディレクトリ構成

```
cmd/main.go              # エントリポイント
pkg/server/
  handler/               # HTTPリクエストの受け取りとレスポンスの返却
    setting.go           # ルーティング
    hero.go
    stage.go
    battle.go
  service/               # 型定義とビジネスロジック
    hero.go
    stage.go
    enemy.go
    battle.go
    seal.go
  repository/            # DB操作
    hero.go
    stage.go
    enemy.go
db/init/                 # DBの初期化SQL
_frontend/               # ゲーム画面（参加者は触らない）
```

## 起動

```bash
# air のインストール（初回のみ）
go install github.com/air-verse/air@latest

# DB 起動
docker compose up -d db

# アプリ起動（ファイル保存で自動リロード）
make dev
```

http://localhost:8080 でゲームが開きます。

## 停止

```bash
# アプリ: Ctrl+C

# DB を止める
docker compose down

# DB のデータごと消す（リセット）
docker compose down -v
```

## トラブルシューティング

**DB に接続できない**

DB の起動が間に合っていない可能性があります。少し待ってから再実行してください。
それでも失敗する場合はコンテナをリセットします。

```bash
docker compose down -v
docker compose up -d db
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
