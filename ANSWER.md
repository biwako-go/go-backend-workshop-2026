# Gopher Slayer — 答え合わせ

各レベルの修正箇所と完成コードをまとめています。

---

## Lv1：ヒーローが攻撃しても0ダメージ

**修正ファイル：** `pkg/server/service/battle.go`

```go
// 修正前
func CalculateDamage(attack int) int {
    return 0
}

// 修正後（attackをそのまま返すだけでOK）
func CalculateDamage(attack int) int {
    return attack
}
```

---

## Lv2：ステージをクリアしても経験値が増えない

**修正ファイル：** `pkg/server/handler/stage.go` の `ClearStage`

```go
newExp := hero.Experience + expGained

// ↓ この3行が抜けているのが原因
if err := h.heroRepo.UpdateExperience(newExp); err != nil {
    return c.JSON(http.StatusInternalServerError, map[string]string{"error": "経験値の更新に失敗しました"})
}
```

---

## Lv3：HP編集ボタンを押すと404になる

**修正ファイル：** `pkg/server/handler/setting.go`

```go
// ヒーロー
api.GET("/hero", hero.GetHero)
api.PUT("/hero/name", hero.UpdateName)
api.PUT("/hero/experience", hero.UpdateExperience)
api.PUT("/hero/hp", hero.UpdateHP)  // ← この行が抜けている
```

---

## Lv4：デーモンへの攻撃が反転する

**修正ファイル：** `pkg/server/handler/battle.go` の `Attack`

```go
// バグ版
func (h *BattleHandler) Attack(c echo.Context) error {
    ...
    result := service.HeroAttack(req)
    // [Lv4 バグ仕込み箇所]
    if req.EnemyName == "デーモン" {
        result.Damage = -result.Damage          // ← バグ: ダメージを反転
        result.Message = "攻撃が吸収された！" + result.Message
    }
    return c.JSON(http.StatusOK, result)
}

// 修正後（if ブロックを丸ごと削除）
func (h *BattleHandler) Attack(c echo.Context) error {
    ...
    result := service.HeroAttack(req)
    return c.JSON(http.StatusOK, result)
}
```

---

## Lv5：ボスドラゴンの攻撃だけ遅い

バグが **2箇所** あります。両方直す必要があります。

### 修正1: `pkg/server/service/battle.go` の `EnemyAttack`

```go
// バグ版
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    damage := CalculateEnemyDamage(req.EnemyAttack)
    if req.EnemyName == "ボスドラゴン" {
        time.Sleep(3 * time.Second)  // ← バグ: 削除する
    }
    ...
}

// 修正後
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    damage := CalculateEnemyDamage(req.EnemyAttack)
    newHeroHP := ApplyDamage(req.HeroHP, damage)
    return AttackResponse{
        Damage:    damage,
        NewHeroHP: newHeroHP,
        Message:   fmt.Sprintf("%s が %d ダメージを与えた！", req.EnemyName, damage),
    }
}
```

### 修正2: `pkg/server/handler/battle.go` の `EnemyAttack`

```go
// バグ版
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
    ...
    if req.EnemyName == "ボスドラゴン" {
        time.Sleep(5 * time.Second)  // ← バグ: 削除する
    }
    result := service.EnemyAttack(req)
    return c.JSON(http.StatusOK, result)
}

// 修正後（if ブロックを丸ごと削除）
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
    ...
    result := service.EnemyAttack(req)
    return c.JSON(http.StatusOK, result)
}
```

---

## Lv6 [ステージ]：封印を並列に解かないとボスと戦えない

**修正ファイル：** `pkg/server/service/seal.go` の `BreakAllSeals`

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

---

## Lv7 [タスク]：テストを書いてバグを見つける

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

**修正ファイル：** `pkg/server/service/battle.go` の `ApplyDamage`

```go
// 修正前
func ApplyDamage(currentHP, damage int) int {
    if currentHP-damage < 0 {
        return 1  // ← バグ: 0 にすべき
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
