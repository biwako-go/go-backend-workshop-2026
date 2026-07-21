# Gopher Slayer — デモ手順書

## 起動

```bash
# DBをリセット（スキーマ変更後は必須）
docker compose down -v
docker compose up -d db

# サーバー起動
go run ./cmd/main.go
```

ブラウザで http://localhost:8080 を開く。

---

## デモの流れ（全体像）

| Lv | バグの症状 | 修正内容 | 学べること |
|----|-----------|---------|-----------|
| Lv1 | 攻撃しても0ダメージ | `return 0` → `return attack` | 関数・戻り値 |
| Lv2 | クリアしても経験値が増えない | DBへの保存処理を追加 | DBへの書き込み |
| Lv3 | HPを増やせない（404） | ルートを1行追加 | ルーティング |
| Lv4 | 攻撃が遅い＋HPが増える | time.Sleep削除＋マイナス修正 | デバッグ |
| Lv5 | Dragon's Lairが解放されない | CalcLevelを完成させる | go test・テスト駆動 |
| Lv6 | 封印解除が時間切れになる | goroutineで並列化 | goroutine・WaitGroup |

---

## Lv1：攻撃しても0ダメージ

**見せ方：** ゲームで攻撃ボタンを押すと「You dealt 0 damage!」と表示される

**修正箇所：** `pkg/server/model/battle.go`
```go
// 修正前
func CalculateDamage(attack int) int {
    return 0
}

// 修正後
func CalculateDamage(attack int) int {
    return attack  // これだけでOK
}
```

**確認：** 攻撃するとダメージが表示される

---

## Lv2：クリアしても経験値が増えない

**見せ方：** Forest をクリアして「EXP +40」と表示されるが、リロードするとEXPが0のまま

**修正箇所：** `pkg/server/handler/stage.go` の `ClearStage`
```go
// newExp を計算した直後に追加
if err := model.UpdateHeroExperience(h.db, newExp); err != nil {
    return c.JSON(http.StatusInternalServerError, ...)
}
```

**確認：** クリア後にリロードしても経験値が保持されている

---

## Lv3：CastleのDark Knightが強すぎて一撃でほぼ死ぬ

**見せ方：** Dark Knight（attack=99）に1発食らうとほぼ死ぬ → MaxHP回復ボタンを押すと404エラー

**修正箇所：** `pkg/server/handler/setting.go`
```go
// この1行を追加
api.PUT("/hero/hp", hero.UpdateHP)
```

**確認：** HP編集でHPを増やせる

---

## Lv4：特定の敵の攻撃がおかしい

**見せ方：** Hell Gate の Demon と戦うと数秒固まって、しかもHPが回復する

**修正箇所：** `pkg/server/model/battle.go` の `EnemyAttack`

バグが2箇所：
1. `time.Sleep(3*time.Second)` → 削除
2. `damage := -calculateDamage(...)` → マイナスを削除

**確認：** 素早く正常なダメージが入る

---

## Lv5：Dragon's Lairが解放されない（テスト）

**見せ方：** Hell Gate をクリアして経験値300を超えても Dragon's Lair がロックされたまま

**原因：** `CalcLevel` が100以上のケース未実装でlevelが常に1のまま

**デモ手順：**
```bash
# 1. テスト実行（今は通る）
go test ./pkg/server/model/... -v

# 2. battle_test.go にケースを追加
{"Lv2の開始", 100, 2},

# 3. テスト再実行（失敗する）
go test ./pkg/server/model/... -v
# FAIL: CalcLevel(100) = 1, want 2

# 4. CalcLevel を修正
# 5. テスト通過 → Dragon's Lair が解放される
```

**修正後の CalcLevel：**
```go
func CalcLevel(experience int) int {
    if experience >= 600 { return 4 }
    if experience >= 300 { return 3 }
    if experience >= 100 { return 2 }
    return 1
}
```

---

## Lv6：封印を同時に解かないとボスが倒せない（goroutine）

**見せ方：** Dragon's Lair で封印解除APIを叩くと「遅すぎた」と失敗する

```bash
curl -X POST http://localhost:8080/api/battle/seals \
  -H "Content-Type: application/json" \
  -d '{"attacks": [50, 30, 40]}'
# → {"success":false,"message":"封印を解くのが遅すぎた！..."}
```

**原因：** 3つの封印を順番に処理 → 3秒かかって2秒制限を超える

**修正箇所：** `pkg/server/model/battle.go` の `BreakSeals`

```go
// goroutineで並列化
var wg sync.WaitGroup
for i, atk := range req.Attacks {
    wg.Add(1)
    go func(i, atk int) {
        defer wg.Done()  // ← deferがここで自然に登場
        time.Sleep(1 * time.Second)
        damages[i] = CalculateDamage(atk)
    }(i, atk)
}
wg.Wait()
```

**確認：**
```bash
curl -X POST http://localhost:8080/api/battle/seals \
  -H "Content-Type: application/json" \
  -d '{"attacks": [50, 30, 40]}'
# → {"success":true,"message":"全ての封印を同時に解いた！ボスを倒せ！",...}
```

---

## 設計の説明ポイント

```
handler/ → HTTPリクエストの受け取り・レスポンス返却のみ
model/   → DB操作 + ビジネスロジック（struct・SQL・計算）
```

**なぜこの構成か：**
- 初心者がコードを追いやすいよう最小構成にしている
- `handler → model → DB` の1方向だけ覚えれば読める
- `gopher-slayer-layered/` に責務分離版（handler/service/repository）も用意してある

---

## トラブルシューティング

**DBに接続できない**
```bash
docker-compose down -v && docker-compose up -d db
# 10秒ほど待つ
go run ./cmd/main.go
```

**スキーマが古い（required_levelがない等）**
```bash
docker-compose down -v
docker-compose up -d db
```

**ポートが使われている**
```bash
lsof -i :8080
kill -9 <PID>
```
