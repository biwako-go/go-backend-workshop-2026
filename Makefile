.PHONY: up down dev

up:
	docker-compose up -d

down:
	docker-compose down

dev:
	air
