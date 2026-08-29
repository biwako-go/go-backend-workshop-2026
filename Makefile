GOBIN := $(shell go env GOPATH)/bin

.PHONY: setup up down reset dev test race bench

# air のインストール（初回のみ）
setup:
	go install github.com/air-verse/air@latest

# DB 起動
up:
	docker compose up -d db

# DB 停止
down:
	docker compose down

# DB をデータごと消してリセット
reset:
	docker compose down -v

# アプリ起動（ファイル保存で自動リロード）
# PATH が通っていなくても動くよう GOPATH/bin の air を直接使う
dev:
	$(GOBIN)/air

# テスト実行
test:
	go test ./...

# データ競合の検出（Lv8）
race:
	go test -race ./...

# ベンチマーク（Lv13）
bench:
	go test ./pkg/server/service/ -bench . -benchmem
