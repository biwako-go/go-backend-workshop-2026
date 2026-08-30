GOBIN := $(shell go env GOPATH)/bin

.PHONY: setup up down reset reset-db start dev-test test race bench

# air のインストール（初回のみ）
setup:
	go install github.com/air-verse/air@latest

# DB 起動
up:
	docker compose up -d db

# DB 停止
down:
	docker compose down

# ゲームの進捗（DB）とコードの修正内容を、完全に最初の状態に戻す
reset:
	@echo "⚠️  コードの修正内容とゲームの進捗（EXPなど）をすべて配布時の状態に戻します。"
	@printf "本当に実行しますか？ [y/N] " && read ans && [ "$$ans" = "y" ]
	git restore .
	git clean -fd
	docker compose down -v
	docker compose up -d db
	@echo "✅ 初期状態に戻しました。make start でゲームを再開できます。"

# DB（ゲームの進捗）だけを初期状態に戻す。コードは触らない
reset-db:
	docker compose down -v
	docker compose up -d db

# アプリ起動（ファイル保存で自動リロード）
# PATH が通っていなくても動くよう GOPATH/bin の air を直接使う
start:
	$(GOBIN)/air

# 配布状態チェック: 全Lvのバグが想定通りに壊れているか検証する（講師向け・要DB起動）
dev-test:
	bash scripts/dev-test.sh

# テスト実行
test:
	go test ./...

# データ競合の検出（Lv17）
race:
	go test -race ./...

# ベンチマーク（Lv26）
bench:
	go test ./pkg/server/service/ -bench . -benchmem
