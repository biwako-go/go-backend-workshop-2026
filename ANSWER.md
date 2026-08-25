# Gopher Slayer — 答え合わせ

各レベルの修正箇所と完成コードをまとめています。

---

## Lv1：ヒーローが攻撃しても0ダメージ

**修正ファイル：** `pkg/server/service/battle.go`

```go
// 修正前
func calculateDamage(attack int) int {
    return 0
}

// 修正後
func calculateDamage(attack int) int {
    if attack <= 0 {
        return 0
    }
    variance := int(float64(attack) * 0.2)
    if variance == 0 {
        return attack
    }
    return attack - variance + rand.Intn(variance*2+1)
}
```

attackをそのまま返すだけでも正解：

```go
func calculateDamage(attack int) int {
    return attack
}
```

---

## Lv2：ステージをクリアしても経験値が増えない

**修正ファイル：** `pkg/server/service/stage.go`

```go
// ClearStage 内の newExp を計算した直後に追加する
newExp := hero.Experience + expGained

// ↓ この4行が抜けているのが原因
if err := s.heroRepo.UpdateExperience(newExp); err != nil {
    return nil, fmt.Errorf("failed to update experience: %w", err)
}
```

---

## Lv3：HP編集ボタンを押すと404になる

**修正ファイル：** `pkg/server/handler/setting.go`

```go
// Hero ルートの末尾に1行追加する
api.GET("/hero", hero.GetHero)
api.PUT("/hero/name", hero.UpdateName)
api.PUT("/hero/experience", hero.UpdateExperience)
api.PUT("/hero/hp", hero.UpdateHP)  // ← この行が抜けている
```

---

## Lv4：特定の敵の攻撃がおかしい

**修正ファイル：** `pkg/server/service/battle.go`

バグが2つ仕込まれています。

```go
// バグ版
func (s *BattleService) EnemyAttack(req EnemyAttackRequest) AttackResponse {
    time.Sleep(3 * time.Second)          // ← バグ1: 不要な待機
    damage := -calculateDamage(req.EnemyAttack)  // ← バグ2: ダメージがマイナス
    return AttackResponse{
        Damage:  damage,
        Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
    }
}

// 修正後
func (s *BattleService) EnemyAttack(req EnemyAttackRequest) AttackResponse {
    damage := calculateDamage(req.EnemyAttack)
    return AttackResponse{
        Damage:  damage,
        Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
    }
}
```

---

## Lv5：特定の敵の攻撃だけ遅い

**修正ファイル：** `pkg/server/handler/battle.go`

```go
// 修正前
if req.EnemyName == "Boss Dragon" {
    time.Sleep(5 * time.Second)  // ← この条件ブロックを丸ごと削除
}

// 修正後（ブロックを削除するだけ）
result := model.EnemyAttack(req)
return c.JSON(http.StatusOK, result)
```

---

## Lv6：テストを書いてバグを見つける

**テストケース例：**

```go
tests := []struct {
    name      string
    currentHP int
    damage    int
    want      int
}{
    {"通常のダメージ", 100, 30, 70},
    {"ちょうど0になるダメージ", 100, 100, 0},
    {"致死ダメージ", 10, 20, 0},  // ← このケースで失敗する
}
```

**修正ファイル：** `pkg/server/service/battle.go`

```go
// 修正前
func ApplyDamage(currentHP, damage int) int {
    if currentHP-damage < 0 {
        return 1  // ← バグ
    }
    return currentHP - damage
}

// 修正後
func ApplyDamage(currentHP, damage int) int {
    if currentHP-damage < 0 {
        return 0
    }
    return currentHP - damage
}
```

---

## Lv7：封印を並列に解かないとボスが倒せない

**修正ファイル：** `pkg/server/service/seal.go`

```go
// 修正後
func BreakAllSeals() []string {
    seals := []string{"炎の封印", "水の封印", "風の封印", "大地の封印", "闇の封印"}
    results := make([]string, len(seals))
    var wg sync.WaitGroup
    for i, seal := range seals {
        wg.Add(1)
        go func(i int, seal string) {
            defer wg.Done()
            time.Sleep(1 * time.Second)
            results[i] = seal + "を解いた！"
        }(i, seal)
    }
    wg.Wait()
    return results
}
```

import に `"sync"` を追加するのを忘れずに。
