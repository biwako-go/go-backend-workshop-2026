.PHONY: up down build dev

up:
	docker-compose up -d

down:
	docker-compose down

build:
	go build -o bin/server ./cmd/main.go

dev:
	reflex -r '\.go$$' -s -- go run ./cmd/main.go
