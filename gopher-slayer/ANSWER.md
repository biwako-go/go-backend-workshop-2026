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

## Lv5（応用）：ボスのステータスを変更するAPIがない

`PUT /api/enemies/:id` をゼロから実装します。

### 1. repository — `pkg/server/repository/stage.go`

```go
type UpdateEnemyParams struct {
    HP     int
    MaxHP  int
    Attack int
}

func (r *StageRepository) UpdateEnemy(id int, params UpdateEnemyParams) error {
    _, err := r.db.Exec(
        `UPDATE enemies SET hp = ?, max_hp = ?, attack = ? WHERE id = ?`,
        params.HP, params.MaxHP, params.Attack, id,
    )
    return err
}
```

### 2. service — `pkg/server/service/stage.go`

```go
type UpdateEnemyRequest struct {
    HP     int `json:"hp"`
    MaxHP  int `json:"max_hp"`
    Attack int `json:"attack"`
}

func (s *StageService) UpdateEnemy(id int, req UpdateEnemyRequest) error {
    return s.stageRepo.UpdateEnemy(id, repository.UpdateEnemyParams{
        HP:     req.HP,
        MaxHP:  req.MaxHP,
        Attack: req.Attack,
    })
}
```

### 3. handler — `pkg/server/handler/stage.go`

```go
func (h *StageHandler) UpdateEnemy(c echo.Context) error {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid enemy id"})
    }
    var req service.UpdateEnemyRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
    }
    if err := h.stageService.UpdateEnemy(id, req); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    return c.JSON(http.StatusOK, map[string]string{"message": "Enemy updated successfully"})
}
```

### 4. routing — `pkg/server/handler/setting.go`

```go
// Stage ルートの末尾に追加
api.GET("/stages", stage.GetStages)
api.GET("/stages/:id/enemies", stage.GetEnemies)
api.POST("/stages/:id/clear", stage.ClearStage)
api.PUT("/enemies/:id", stage.UpdateEnemy)  // ← 追加
```

### 動作確認

```bash
curl -X PUT http://localhost:8080/api/enemies/5 \
  -H "Content-Type: application/json" \
  -d '{"hp": 100, "max_hp": 100, "attack": 10}'
# → {"message":"Enemy updated successfully"}
```
