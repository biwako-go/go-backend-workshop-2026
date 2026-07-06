# Gopher Slayer

Go バックエンド開発を体験するワークショップ用ゲームです。
タスクは [Tasks.md](Tasks.md) を参照してください。

## 起動

```bash
# DB だけ起動
docker-compose up -d db

# アプリ起動
go run ./cmd/main.go
```

http://localhost:8080 でゲームが開きます。

## 停止

```bash
# アプリ: Ctrl+C

# DB を止める
docker-compose down

# DB のデータごと消す（リセット）
docker-compose down -v
```

## トラブルシューティング

**DB に接続できない**

DB の起動が間に合っていない可能性があります。少し待ってから再実行してください。
それでも失敗する場合はコンテナをリセットします。

```bash
docker-compose down -v
docker-compose up -d db
```

**ポート 3306 が使用中**

`.env` と `docker-compose.yaml` のポート番号を揃えて変更してください（例: 3307）。

```yaml
# docker-compose.yaml
ports:
  - "3307:3306"
```

```env
# .env
DB_PORT=3307
```

**ポート 8080 が使用中**

`.env` の `PORT` を変更してください。
