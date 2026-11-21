# Gopher Slayer — アーキテクチャ

このドキュメントは、Gopher Slayer の全体構造と「リクエストがどこを通ってDBに届くのか」をまとめたものです。
バグを探すときの地図として使ってください。

## 全体像

```mermaid
flowchart LR
    subgraph Browser["ブラウザ"]
        FE["ゲーム画面<br>_frontend/"]
    end
    subgraph Server["Go サーバー (Echo)"]
        H["handler<br>HTTPの入出力"]
        S["service<br>型定義・ビジネスロジック"]
        R["repository<br>DB操作"]
    end
    DB[("MySQL 8.0<br>heroes / stages / enemies")]

    FE -- "fetch /api/..." --> H
    H --> S
    H --> R
    R --> DB
```

- **フロントエンド**（`_frontend/`）はゲーム画面。参加者は触らない。バトル中のHPはフロント側で管理し、サーバーは「ダメージ計算」などの結果だけを返す
- **バックエンド**（`cmd/` + `pkg/`）が今回の主役。Echo で HTTP API を提供する

## レイヤー構成と責務

```
handler → service → repository → DB
```

| レイヤー | 場所 | 責務 | 例 |
|---------|------|------|-----|
| **handler** | `pkg/server/handler/` | HTTPリクエストの受け取り・バリデーション・レスポンス返却 | `c.Bind(&req)` してserviceを呼び、`c.JSON(...)` で返す |
| **service** | `pkg/server/service/` | 型定義（struct）とビジネスロジック | ダメージ計算、封印解除、詠唱中断 |
| **repository** | `pkg/server/repository/` | DBへの SELECT / INSERT / UPDATE | `r.db.QueryRow(...)`、`r.db.Exec(...)` |

**依存の方向は一方通行**（handler → service → repository）。逆流しない。
repository が handler を呼ぶことはないし、service が HTTP のことを知ることもない。

> **設計方針：** この教材では interface による抽象化を意図的に使っていない。
> 初心者が「コードをクリックで辿れば必ず実装に着く」状態を保つため。
> 抽象化を学びたい人は [CHALLENGES.md](CHALLENGES.md) の A-1〜A-3 へ。

## リクエストの流れ（例：ステージクリア）

「ステージ1をクリアした」ときに何が起こるか：

```mermaid
sequenceDiagram
    participant F as ゲーム画面<br>(game.js)
    participant Rt as setting.go<br>(ルーティング)
    participant H as handler/stage.go<br>ClearStage()
    participant R as repository
    participant DB as MySQL

    F->>Rt: POST /api/stages/1/clear
    Rt->>H: ClearStage(c)
    H->>R: stageRepo.GetByID(1)
    R->>DB: SELECT ... FROM stages WHERE id = 1
    H->>R: heroRepo.Get()
    R->>DB: SELECT ... FROM heroes WHERE id = 1
    H->>R: stageRepo.GetTotalExp(1)
    R->>DB: SELECT SUM(experience_reward) ...
    H->>R: heroRepo.UpdateExperience(newExp)
    R->>DB: UPDATE heroes SET experience = ...
    H-->>F: 200 {"message":"クリア！", "experience_gained":40}
```

バグを探すときは、この経路を**上から順に**確認していけばよい。
ルーティング（`setting.go`）→ handler → service → repository の順で読むのが基本。

## フォルダ構成

```
.
├── cmd/main.go                # エントリポイント（起動処理）
├── pkg/
│   ├── constant/constant.go   # 環境変数・設定
│   ├── db/conn.go             # DB接続（Lv14/Lv24の修正対象）
│   └── server/
│       ├── server.go          # Echoの組み立て：ミドルウェア・静的配信・DI
│       ├── handler/           # ルーティング + 各API
│       ├── service/           # 型定義 + ロジック（バグの多くはここ）
│       └── repository/        # DB操作
├── db/init/                   # テーブル定義(1_ddl.sql)・初期データ(2_dml.sql)
├── _frontend/                 # ゲーム画面（参加者は触らない）
├── api-document.yaml          # API仕様（OpenAPI）
├── Tasks.md                   # ワークショップタスク（Lv1〜Lv42）
├── ANSWER.md                  # 答え合わせ（講師向け）
└── CHALLENGES.md              # 発展課題
```

### 起動の流れ（`cmd/main.go`）

```
constant.Load()   … 環境変数を読む
    ↓
appdb.Connect()   … MySQLに接続（リトライ付き）
    ↓
server.New(db)    … Echo生成 → ミドルウェア → repository/handler を組み立て → ルート登録
    ↓
e.Start(":8080")  … サーバー起動
```

`server.New` の中で **repository → handler の順に手作業で組み立てて注入**している（手動DI）。
新しいAPIを増やすときも、この組み立てとルート登録（`handler/setting.go`）に追記する。

## API エンドポイント一覧

すべて `/api` プレフィックス付き。ルーティングは `pkg/server/handler/setting.go`。

| メソッド | パス | 内容 | 関連Lv |
|---------|------|------|--------|
| GET | `/hero` | ヒーロー取得 | — |
| PUT | `/hero/name` | 名前更新 | — |
| PUT | `/hero/experience` | 経験値更新 | — |
| PUT | `/hero/hp` | HP更新 | **Lv3**（ルート追加） |
| POST | `/hero/revive` | GameOver後の全回復（変更不要） | 補助API |
| GET | `/stages` | ステージ一覧（解放状況付き） | — |
| GET | `/stages/:id/enemies` | ステージの敵一覧 | — |
| POST | `/stages/:id/clear` | ステージクリア（EXP付与） | **Lv2**, **Lv14** |
| POST | `/stages/5/challenge` | 封印解除チャレンジ | **Lv16** |
| GET | `/challenges` | チャレンジの敵一覧（変更不要） | Lv6〜Lv42の共通基盤 |
| GET | `/legend` | 古文書の言い伝え | **Lv27** |
| POST | `/legend/speedread` | 古文書の速読（判定用） | **Lv27** |
| POST | `/battle/attack` | ヒーローの攻撃 | **Lv1**, **Lv4**, **Lv23**, **Lv28** |
| POST | `/battle/enemy-attack` | 敵の攻撃 | **Lv5**, **Lv22** |
| POST | `/battle/horde` | 群れ討伐 | **Lv17** |
| POST | `/battle/interrupt` | 詠唱中断 | **Lv18** |
| POST | `/battle/defuse` | 呪いの爆弾解除 | **Lv25** |
| POST | `/battle/report` | 討伐報告書の作成（判定用） | **Lv26** |
| POST | `/battle/prophecy` | 予言者の会心予知（判定用） | **Lv28** |
| POST | `/battle/scout` | 敵の偵察（判定用） | **Lv6** |
| POST | `/battle/finish` | 不死のゾンビへのとどめ（判定用） | **Lv10** |
| POST | `/battle/mirror` | 鏡の鎧への攻撃（判定用） | **Lv7** |
| POST | `/battle/loot` | 戦利品の回収（判定用） | **Lv8** |
| POST | `/battle/titan` | 巨神への合計ダメージ検分（判定用） | **Lv9** |
| POST | `/battle/engrave` | 討伐碑への刻銘（判定用） | **Lv11** |
| POST | `/battle/mirage` | 分身の見破り（判定用） | **Lv12** |
| POST | `/battle/formation` | 隊列の安定性検分（判定用） | **Lv13** |
| POST | `/battle/vault` | 宝物庫のDB接続検分（判定用） | **Lv15** |
| POST | `/battle/courier` | 伝令の送信（判定用） | **Lv20** |
| GET | `/mock/guild` | 眠っている遠方のギルド（変更不要） | Lv20の相手役 |
| POST | `/battle/assault` | 城門突撃の同時数検分（判定用） | **Lv21** |
| POST | `/battle/familiars` | 使い魔の帰宅検分（判定用） | **Lv24** |
| POST | `/battle/march` | 骸骨兵の行進の迎撃（判定用） | **Lv29** |
| POST | `/battle/library` | 禁書庫の貸し出し審査（判定用） | **Lv30** |
| POST | `/battle/reinforce` | 援軍の点呼を10回検分（判定用） | **Lv31** |
| POST | `/battle/barrier` | 結界の弱点の見破り（判定用） | **Lv32** |
| POST | `/battle/forgery` | 報酬請求書の審査（判定用） | **Lv33** |
| POST | `/battle/appraise` | 宝の鑑定書の検分（判定用） | **Lv34** |
| POST | `/battle/roster` | 冒険者100人の登録番号の検分（判定用） | **Lv35** |
| POST | `/battle/pigeons` | 伝書鳩の待ちぼうけ（goroutineリーク）検分（判定用） | **Lv36** |
| POST | `/battle/oldmap` | 宝の地図の読み取り（存在しない地図で panic しないか）（判定用） | **Lv37** |
| POST | `/battle/treasury` | 金庫の窓口への送金リクエスト3通り（CSRF）（判定用） | **Lv38** |
| POST | `/battle/fortress` | 砦への伝令の URL 検分（判定用） | **Lv39** |
| POST | `/battle/chronicle` | 戦闘記録（掲示板と監査記録）の検分（判定用） | **Lv40** |
| POST | `/battle/decree` | 王の勅書の署名の検分（判定用） | **Lv41** |
| POST | `/battle/satchel` | 道具袋から回復薬だけを飲めるかの検分（判定用） | **Lv42** |
| POST | `/quests/gather` | ギルド依頼の調査 | **Lv19** |
| GET | `/debug/memory` | メモリ・goroutine観測（変更不要） | Lv22/Lv23の観測用 |
| GET | `/debug/goroutineleak` | 漏れた goroutine のスタック（Go 1.27 の goroutineleak プロファイル。変更不要） | Lv36の観測用 |

詳細なリクエスト/レスポンス形式は [api-document.yaml](api-document.yaml) を参照。

## DB 構成

MySQL 8.0。テーブルは4つ。定義は `db/init/1_ddl.sql`、初期データは `db/init/2_dml.sql`。

```mermaid
erDiagram
    heroes {
        int id PK "常に1件のみ (id=1)"
        varchar name
        int hp
        int max_hp
        int attack
        int level
        int experience
    }
    stages {
        int id PK
        varchar name
        varchar description
        int required_experience "解放に必要なEXP"
        int order_num
    }
    enemies {
        int id PK
        int stage_id FK
        varchar name
        int hp
        int max_hp
        int attack
        int experience_reward
    }
    challenge_enemies {
        int id PK
        varchar action "チャレンジ種別キー"
        varchar name
        int hp
        int max_hp
        int attack
        int unlock_exp "解放に必要なEXP"
    }
    stages ||--o{ enemies : "1ステージに複数の敵"
```

- `challenge_enemies` は Lv6〜Lv42 のチャレンジで対決する敵。`unlock_exp` に達するとカードが解放され、倒すとフロントが `PUT /api/hero/experience` で EXP を +100 して次の敵が解放される

- ヒーローは常に `id = 1` の1件だけ（ログイン機能はない）
- ステージの解放判定は「ヒーローのEXP ≧ `required_experience`」をhandler側で計算している。チャレンジの解放判定は「EXP ≧ `unlock_exp`」をフロント側で計算している

## 状態の持ち方

| 状態 | 置き場所 | 補足 |
|------|---------|------|
| ヒーローのステータス（EXP・最大HP等） | MySQL | リロードしても消えない |
| バトル中のHP（ヒーロー・敵） | フロント（game.js のグローバル変数） | サーバーは計算結果を返すだけ |
| サーバープロセス内の状態 | serviceのグローバル変数 | Lv17のカウンタ、Lv23の怨念、Lv27の解読結果など。**再起動で消える** |
| 最新Goキャッチアップのモードとクリア状況 | ブラウザ（localStorage） | EXP には反映しない（本編の進行を壊さないため）。ブラウザごとに別々 |

## ワークショップ教材としての仕掛け

- バグが仕込まれている箇所には必ず `[LvN バグ仕込み箇所]` というコメントがある（`grep -rn "バグ仕込み箇所" pkg cmd` で一覧できる）
- `GET /api/debug/memory` と `GET /api/debug/goroutineleak` は観測用の正しいコード。参加者は変更しない
- `make start` は [air](https://github.com/air-verse/air) によるホットリロード起動。ファイルを保存すると自動で再起動する（Lv25でサーバーが落ちても勝手に復活する）
- Go 1.27 が必要（Lv29〜Lv42 で Go 1.23〜1.27 の新機能を使うため）。go.mod に書いてあるので、Go 1.21 以降が入っていれば必要なバージョンが自動でダウンロードされる
- **最新Goキャッチアップモード**：ステージ選択画面のボタン（または `/?mode=catchup`）で、Go 1.25〜1.27 の新機能のレベル（Lv31〜Lv42 のうち12レベル）だけを EXP に関係なく挑戦できる。どのレベルが対象かは `_frontend/game.js` の `ADVANCED_CHALLENGES` の `go` と `CATCHUP_VERSIONS` で決まる

## 関連ドキュメント

- [README.md](README.md) — 起動方法
- [Tasks.md](Tasks.md) — ワークショップタスク（Lv1〜Lv42）
- [ANSWER.md](ANSWER.md) — 答え合わせ（講師向け）
- [CHALLENGES.md](CHALLENGES.md) — 発展課題
