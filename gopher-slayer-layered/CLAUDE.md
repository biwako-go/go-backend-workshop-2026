# Gopher Slayer - Layered Architecture版

## 目的

`gopher-slayer`（ワークショップ教材）をLayered Architectureにリファクタした参考実装。
元の `handler → model → DB` 構成と比較することで、責務分離の意味を理解する。

## gopher-slayerとの違い

| 観点 | gopher-slayer | gopher-slayer-layered |
|------|--------------|----------------------|
| 構成 | handler → model → DB | handler → service → repository → DB |
| model/ | struct + DB操作 + ロジックが混在 | entity/ に分離 |
| バリデーション | handler内 | service内 |
| DB操作 | model内の関数 | repository層のメソッド |
| 対象 | Go初心者 | Goに慣れてきた人 |

## アーキテクチャ

```
handler/     HTTPリクエストの受け取り・レスポンスの返却のみ
    ↓
service/     ビジネスロジック・バリデーション
    ↓
repository/  DBアクセスのみ（SQL）

entity/      ドメイン型（どの層にも依存しない）
```

## 依存関係の組み立て

[pkg/server/server.go](pkg/server/server.go) で repository → service → handler の順にnewして渡す。

```go
heroRepo    := repository.NewHeroRepository(db)
heroService := service.NewHeroService(heroRepo)
heroHandler := handler.NewHeroHandler(heroService)
```

これが依存性注入（DI）。各層は自分より下の層を自分でnewせず、外から受け取る。

## フォルダ構造

```
.
├── cmd/
│   └── main.go          # エントリポイント
├── entity/
│   ├── hero.go          # Hero型
│   ├── enemy.go         # Enemy型
│   └── stage.go         # Stage型
├── repository/
│   ├── hero.go          # heroes テーブルのCRUD
│   ├── enemy.go         # enemies テーブルのCRUD
│   └── stage.go         # stages テーブルのCRUD
├── service/
│   ├── hero.go          # ヒーロー操作のビジネスロジック
│   ├── battle.go        # ダメージ計算
│   └── stage.go         # ステージクリア処理
├── handler/
│   ├── hero.go          # /api/hero 系
│   ├── battle.go        # /api/battle 系
│   ├── stage.go         # /api/stages 系
│   └── setting.go       # ルーティング登録
└── pkg/
    ├── constant/        # 設定・環境変数
    ├── db/              # DB接続
    └── server/          # Echo初期化・DI組み立て
```

## 起動

gopher-slayer と同じDBを共有できる。

```bash
# gopher-slayer側でDBを起動済みなら
go run ./cmd/main.go
```

## 元の実装と見比べるポイント

- `gopher-slayer/pkg/server/model/hero.go` vs `entity/hero.go` + `repository/hero.go` + `service/hero.go`
- バリデーション（`name is required`）がhandlerからserviceに移った
- `ClearStage` のロジックがhandlerからservice/stage.goに移った
- `server.go` でDIの配線が見えるようになった
