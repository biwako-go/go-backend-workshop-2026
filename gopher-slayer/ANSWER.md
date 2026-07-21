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

## Lv3：HP回復ボタンを押しても何も起きない

### Step 1: `pkg/server/model/hero.go` の `UpdateHeroHP`

```go
func UpdateHeroHP(db *sql.DB, hp int) error {
    _, err := db.Exec(`UPDATE heroes SET hp = ? WHERE id = 1`, hp)
    return err
}
```

### Step 2: `pkg/server/handler/hero.go` の `UpdateHP`

```go
func (h *HeroHandler) UpdateHP(c echo.Context) error {
    var req model.UpdateHPRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
    }
    if err := model.UpdateHeroHP(h.db, req.HP); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
    }
    return c.JSON(http.StatusOK, map[string]string{"message": "HP updated successfully"})
}
```

### Step 3: `pkg/server/handler/setting.go` のルート追加

```go
api.PUT("/hero/hp", hero.UpdateHP)  // コメントアウトを解除する
```

---

## Lv4：特定の敵の攻撃がおかしい

**修正ファイル：** `pkg/server/service/battle.go`

バグが1つ仕込まれています。

```go
// バグ版
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    time.Sleep(3 * time.Second)  // ← バグ: 不要な待機
    damage := CalculateDamage(req.EnemyAttack)
    return AttackResponse{
        Damage:  damage,
        Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
    }
}

// 修正後
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
    damage := CalculateDamage(req.EnemyAttack)
    return AttackResponse{
        Damage:  damage,
        Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
    }
}
```

---

## Lv5：テストを書いてバグを見つける

**修正ファイル：** `pkg/server/model/battle.go` の `CalcLevel`

バグの原因：`>=` であるべき比較が `>` になっているため、境界値でレベルが上がらない。

```go
// バグ版（100以上のケースが未実装）
func CalcLevel(experience int) int {
    if experience < 100 {
        return 1
    }
    return 1 // 100以上のケースがない → 常に Lv1 のまま
}

// 修正後（100以上のケースを実装する）
func CalcLevel(experience int) int {
    if experience >= 600 {
        return 4
    }
    if experience >= 300 {
        return 3
    }
    if experience >= 100 {
        return 2
    }
    return 1
}
```

テストの完成形：

```go
tests := []struct {
    name       string
    experience int
    wantLevel  int
}{
    {"初期状態", 0, 1},
    {"Lv1の途中", 50, 1},
    {"Lv1の上限", 99, 1},
    {"Lv2の開始", 100, 2},
    {"Lv2の上限", 299, 2},
    {"Lv3の開始", 300, 3},
    {"Lv3の上限", 599, 3},
    {"Lv4の開始", 600, 4},
    {"Lv4以上", 999, 4},
}
```

---

## Lv6：封印を同時に解かないとボスが倒せない

**修正ファイル：** `pkg/server/model/battle.go` の `BreakSeals`

```go
// 修正後
func BreakSeals(req BreakSealsRequest) BreakSealsResponse {
    start := time.Now()
    damages := make([]int, len(req.Attacks))

    var wg sync.WaitGroup
    for i, atk := range req.Attacks {
        wg.Add(1)
        go func(i, atk int) {
            defer wg.Done()
            time.Sleep(1 * time.Second)
            damages[i] = CalculateDamage(atk)
        }(i, atk)
    }
    wg.Wait()

    if time.Since(start) > 2*time.Second {
        return BreakSealsResponse{
            Success: false,
            Message: "封印を解くのが遅すぎた！ボスのHPが回復してしまった",
            Damages: damages,
        }
    }
    return BreakSealsResponse{
        Success: true,
        Message: "全ての封印を同時に解いた！ボスを倒せ！",
        Damages: damages,
    }
}
```

バグ版との違い：
- `for` ループの中に `go func()` を追加してgoroutineで並列実行
- `defer wg.Done()` でgoroutine終了時に必ずDone()が呼ばれる
- `wg.Wait()` で全goroutineの完了を待つ
- `_ = sync.WaitGroup{}` のダミー行を削除する

---

## Lv5（旧・応用）：ボスのステータスを変更するAPIがない

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
