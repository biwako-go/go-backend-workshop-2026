FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o gopher-slayer ./cmd/main.go

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/gopher-slayer .
COPY --from=builder /app/_frontend ./_frontend
COPY --from=builder /app/api-document.yaml .
EXPOSE 8080
CMD ["./gopher-slayer"]
