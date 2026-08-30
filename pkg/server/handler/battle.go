package handler

import (
	"fmt"
	"net/http"
	"runtime"
	"time"
	"unicode/utf8"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/repository"
	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type BattleHandler struct {
	enemyRepo *repository.EnemyRepository
}

func NewBattleHandler(enemyRepo *repository.EnemyRepository) *BattleHandler {
	return &BattleHandler{enemyRepo: enemyRepo}
}

// Attack はヒーローが敵を攻撃する処理。
// サーバー側でダメージを計算し、敵のHPはクライアント側で管理する。
// POST /api/battle/attack
func (h *BattleHandler) Attack(c echo.Context) error {
	var req service.AttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの形式が正しくありません"})
	}
	result := service.HeroAttack(req)
	// [Lv4 バグ仕込み箇所]
	// デーモン戦ではヒーローの攻撃が反転し、敵を回復させてしまう
	if req.EnemyName == "デーモン" {
		result.Damage = -result.Damage
		result.Message = "攻撃が吸収された！" + result.Message
	}
	return c.JSON(http.StatusOK, result)
}

// SlayHorde はゴブリンの群れを一掃する処理。
// POST /api/battle/horde
func (h *BattleHandler) SlayHorde(c echo.Context) error {
	result := service.SlayHorde(100)
	return c.JSON(http.StatusOK, result)
}

// Report は討伐報告書を作成する処理（Lv26の判定用）。
// 40000行の討伐記録を1つの報告書にまとめる。1秒を超えると軍記官が音を上げる。
// POST /api/battle/report
func (h *BattleHandler) Report(c echo.Context) error {
	logs := make([]string, 40000)
	for i := range logs {
		logs[i] = fmt.Sprintf("%d体目のゴブリンを討伐した！", i+1)
	}

	start := time.Now()
	report := service.BuildBattleReport(logs)
	elapsed := time.Since(start)

	if elapsed > 1*time.Second {
		return c.JSON(http.StatusRequestTimeout, map[string]interface{}{
			"error":      fmt.Sprintf("報告書の作成に %.1f秒 もかかり、軍記官が音を上げた！", elapsed.Seconds()),
			"elapsed_ms": elapsed.Milliseconds(),
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":    fmt.Sprintf("%d行の報告書が %dms で完成した！", len(logs), elapsed.Milliseconds()),
		"length":     len(report),
		"elapsed_ms": elapsed.Milliseconds(),
	})
}

// Prophecy は予言者がヒーローの会心を予知する処理（Lv28の判定用）。
// POST /api/battle/prophecy
func (h *BattleHandler) Prophecy(c echo.Context) error {
	predicted, actual, allMatch := service.Prophecy()
	message := "予言が外れた！会心の行方は誰にも読めない！"
	if allMatch {
		message = "予言者「すべてお見通しだ」——会心の行方をすべて的中された！乱数が予測可能になっている…"
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"predicted": predicted,
		"actual":    actual,
		"all_match": allMatch,
		"message":   message,
	})
}

// Scout はステルスGopherを偵察する処理（Lv6の判定用）。
// POST /api/battle/scout
func (h *BattleHandler) Scout(c echo.Context) error {
	return c.JSON(http.StatusOK, service.ScoutEnemy())
}

// Mirror は鏡の鎧のGopherに攻撃する処理（Lv7の判定用）。
// POST /api/battle/mirror
func (h *BattleHandler) Mirror(c echo.Context) error {
	before, after := service.ChallengeMirrorKnight()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"before": before,
		"after":  after,
		"ok":     after <= 0,
	})
}

// Loot は戦利品を集める処理（Lv8の判定用）。
// POST /api/battle/loot
func (h *BattleHandler) Loot(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{
		"loot":    service.CollectLoot(),
		"message": "戦利品を袋に詰めた！",
	})
}

// Titan は巨神Gopherへの連続攻撃の合計ダメージを検分する処理（Lv9の判定用）。
// POST /api/battle/titan
func (h *BattleHandler) Titan(c echo.Context) error {
	total := service.ChallengeTitan()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"total":    total,
		"expected": 750,
		"ok":       total == 750,
	})
}

// Engrave は討伐碑に敵の名前を刻む処理（Lv11の判定用）。
// POST /api/battle/engrave
func (h *BattleHandler) Engrave(c echo.Context) error {
	targets := []string{"ボスドラゴン", "ゴブリンの群れ", "スライム"}
	var names []string
	ok := true
	for _, t := range targets {
		n := service.EngraveName(t)
		// 刻んだ名前が「壊れていない文字列」かつ「5文字以内」かを検分する
		if !utf8.ValidString(n) || utf8.RuneCountInString(n) > 5 {
			ok = false
		}
		names = append(names, n)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"names": names,
		"ok":    ok,
	})
}

// Mirage は分身Gopherとの戦いを検分する処理（Lv12の判定用）。
// POST /api/battle/mirage
func (h *BattleHandler) Mirage(c echo.Context) error {
	body, mirage := service.ChallengeMirage()
	// 本体（50/30/20）が無傷のままかを検分する
	ok := len(body) == 3 && body[0] == 50 && body[1] == 30 && body[2] == 20
	return c.JSON(http.StatusOK, map[string]interface{}{
		"body":   body,
		"mirage": mirage,
		"ok":     ok,
	})
}

// Formation は討伐隊の隊列を5回組んで、毎回同じ順序になるか検分する処理（Lv13の判定用）。
// POST /api/battle/formation
func (h *BattleHandler) Formation(c echo.Context) error {
	var lines [][]string
	stable := true
	for i := 0; i < 5; i++ {
		lines = append(lines, service.FormBattleLine())
	}
	for i := 1; i < len(lines); i++ {
		for j := range lines[i] {
			if lines[i][j] != lines[0][j] {
				stable = false
			}
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"lines":  lines,
		"stable": stable,
	})
}

// Vault は宝物庫を8回覗いて、DB接続（扉）が閉じられているか検分する処理（Lv15の判定用）。
// バグ状態では覗くたびに接続がリークするため、回数は8回に抑えてある
// （再挑戦を繰り返すとMySQLの接続上限に近づき、ゲーム全体が不調になる。その場合はサーバー再起動で回復）。
// POST /api/battle/vault
func (h *BattleHandler) Vault(c echo.Context) error {
	before := h.enemyRepo.OpenConnections()
	for i := 0; i < 8; i++ {
		if _, err := h.enemyRepo.PeekVault(); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
	}
	after := h.enemyRepo.OpenConnections()
	leaked := after - before
	return c.JSON(http.StatusOK, map[string]interface{}{
		"before": before,
		"after":  after,
		"leaked": leaked,
		"ok":     leaked < 5,
	})
}

// Courier は眠っているギルドへ伝令を送る処理（Lv20の判定用）。
// POST /api/battle/courier
func (h *BattleHandler) Courier(c echo.Context) error {
	url := "http://" + c.Request().Host + "/api/mock/guild"
	start := time.Now()
	_, err := service.SendCourier(url)
	elapsed := time.Since(start)
	if err != nil && elapsed < 5*time.Second {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"message":    fmt.Sprintf("返事はなかったが、伝令は %.1f秒 で見切りをつけて帰還した！", elapsed.Seconds()),
			"elapsed_ms": elapsed.Milliseconds(),
			"ok":         true,
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":    "伝令が帰ってきた",
		"elapsed_ms": elapsed.Milliseconds(),
		"ok":         false,
	})
}

// MockGuild は眠っている遠方のギルド（Lv20の相手役。変更しない）。
// 10秒間眠ってから返事をする。
// GET /api/mock/guild
func (h *BattleHandler) MockGuild(c echo.Context) error {
	time.Sleep(10 * time.Second)
	return c.JSON(http.StatusOK, map[string]string{"reply": "zzz…なんだって？"})
}

// Assault は城門への突撃の同時実行数を検分する処理（Lv21の判定用）。
// POST /api/battle/assault
func (h *BattleHandler) Assault(c echo.Context) error {
	peak := service.LaunchAssault()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"peak":  peak,
		"limit": 5,
		"ok":    peak <= 5,
	})
}

// Familiars は使い魔を10体召喚して、全員ちゃんと帰宅するか検分する処理（Lv24の判定用）。
// POST /api/battle/familiars
func (h *BattleHandler) Familiars(c echo.Context) error {
	before := runtime.NumGoroutine()
	service.SummonFamiliars()
	time.Sleep(300 * time.Millisecond) // 仕事（100ms）が終わって帰宅するのを待つ
	after := runtime.NumGoroutine()
	leaked := after - before
	if leaked < 0 {
		leaked = 0
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"before": before,
		"after":  after,
		"leaked": leaked,
		"ok":     leaked < 5,
	})
}

// Defuse は呪いの爆弾の解除を試みる処理。
// POST /api/battle/defuse
func (h *BattleHandler) Defuse(c echo.Context) error {
	message := service.DefuseCurse()
	return c.JSON(http.StatusOK, map[string]string{"message": message})
}

// InterruptCast はボスの詠唱の中断を試みる処理。
// POST /api/battle/interrupt
func (h *BattleHandler) InterruptCast(c echo.Context) error {
	message, interrupted := service.InterruptCast()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":     message,
		"interrupted": interrupted,
	})
}

// EnemyAttack は敵がヒーローを攻撃する処理。
// サーバー側でダメージと新しいHP（ApplyDamage適用後）を計算して返す。
// POST /api/battle/enemy-attack
func (h *BattleHandler) EnemyAttack(c echo.Context) error {
	var req service.EnemyAttackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの形式が正しくありません"})
	}
	// [Lv5 バグ仕込み箇所]
	// ボスドラゴンの攻撃だけなぜか遅い。サービス層だけでなくハンドラー層も確認しよう。
	if req.EnemyName == "ボスドラゴン" {
		time.Sleep(5 * time.Second)
	}
	result := service.EnemyAttack(req)
	return c.JSON(http.StatusOK, result)
}
