package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"runtime/pprof"
	"slices"
	"strconv"
	"strings"
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

// Finish は不死のゾンビにとどめの一撃を放つ処理（Lv10の判定用）。
// POST /api/battle/finish
func (h *BattleHandler) Finish(c echo.Context) error {
	before := 66 // 不死のゾンビのHP（challenge_enemies の finish と同じ値）
	after := service.FinishingBlow(before, 9999)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"before": before,
		"after":  after,
		"ok":     after == 0,
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

// March は骸骨兵の行進を迎え撃つ処理（Lv29の判定用）。
// 骸骨王を倒したところで break して、行進がぴたりと止まるかを検分する。
// POST /api/battle/march
func (h *BattleHandler) March(c echo.Context) (err error) {
	// バグ状態では break のあともイテレータが yield を呼び続けて panic する。
	// panic の中身を画面で読めるよう、ここで受け止めて判定結果として返す
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Lv29] 骸骨兵の行進が止まらず panic: %v", r)
			err = c.JSON(http.StatusOK, map[string]interface{}{
				"ok":    false,
				"panic": fmt.Sprint(r),
			})
		}
	}()
	defeated := service.RepelSkeletonMarch()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"defeated": defeated,
		"ok":       slices.Equal(defeated, []string{"骸骨兵", "骸骨弓兵", "骸骨騎士", "骸骨王"}),
	})
}

// Library は禁書泥棒のGopherが巻物を借りに来る処理（Lv30の判定用）。
// 毎回、一時ディレクトリに「書庫（library）」と「禁書庫（forbidden）」を作り、次の依頼を試す。
//  1. 書庫の巻物を借りる（正規の依頼）→ 貸し出せること
//  2. "../" で書庫の外の禁書を指す → 断ること
//  3. 書庫の中の抜け道（シンボリックリンク）経由で禁書を指す → 断ること
//
// POST /api/battle/library
func (h *BattleHandler) Library(c echo.Context) error {
	base, err := os.MkdirTemp("", "gopher-library-*")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer os.RemoveAll(base)

	libraryDir := filepath.Join(base, "library")
	forbiddenDir := filepath.Join(base, "forbidden")
	const herbBook = "薬草は煎じて飲むとHPが30回復する。"
	const curseBook = "【禁呪】メテオ——天より星を降らせる禁断の呪文。"
	for _, f := range []struct{ dir, name, body string }{
		{libraryDir, "薬草の図鑑.txt", herbBook},
		{forbiddenDir, "禁呪の書.txt", curseBook},
	} {
		if err := os.MkdirAll(f.dir, 0o755); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		if err := os.WriteFile(filepath.Join(f.dir, f.name), []byte(f.body), 0o644); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
	}

	type lendRequest struct {
		Name      string `json:"name"`      // 依頼された巻物の名前
		Forbidden bool   `json:"forbidden"` // 禁書を狙った依頼か
		Lent      bool   `json:"lent"`      // 中身を渡してしまったか
		OK        bool   `json:"ok"`        // 正しく対応できたか
	}
	requests := []*lendRequest{
		{Name: "薬草の図鑑.txt"},
		{Name: "../forbidden/禁呪の書.txt", Forbidden: true},
	}
	// 書庫の中から禁書庫へ通じる抜け道。シンボリックリンクを作れない環境（Windowsの権限不足など）では、この検査を省く
	if os.Symlink("../forbidden", filepath.Join(libraryDir, "抜け道")) == nil {
		requests = append(requests, &lendRequest{Name: "抜け道/禁呪の書.txt", Forbidden: true})
	}

	allOK := true
	for _, r := range requests {
		content, err := service.LendScroll(libraryDir, r.Name)
		if r.Forbidden {
			r.Lent = err == nil && strings.Contains(content, "【禁呪】")
			r.OK = !r.Lent // 禁書は持ち出されてはいけない
		} else {
			r.Lent = err == nil && content == herbBook
			r.OK = r.Lent // 書庫の巻物はちゃんと貸し出せること
		}
		if !r.OK {
			allOK = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"requests": requests,
		"ok":       allOK,
	})
}

// Reinforce は「援軍10部隊の到着を待ってから出陣する」を10回くり返して検分する（Lv31の判定用）。
// wg.Add の位置を間違えていても、たまたま全部隊が間に合う回があるため、1回の成功では判定しない。
// POST /api/battle/reinforce
func (h *BattleHandler) Reinforce(c echo.Context) error {
	const sorties = 10
	arrivals := make([]int, 0, sorties) // 各出陣の時点で到着していた部隊数
	full := 0                           // 10部隊そろって出陣できた回数
	for range sorties {
		n := service.MusterReinforcements()
		arrivals = append(arrivals, n)
		if n == 10 {
			full++
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"arrivals": arrivals,
		"full":     full,
		"sorties":  sorties,
		"ok":       full == sorties,
	})
}

// Barrier は結界術師Gopherの3層の結界を破れるか検分する処理（Lv32の判定用）。
// POST /api/battle/barrier
func (h *BattleHandler) Barrier(c echo.Context) error {
	results := service.BreakBarriers()
	ok := len(results) == 3
	for _, r := range results {
		if !r.Broken {
			ok = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"results": results,
		"ok":      ok,
	})
}

// Forgery は偽造師Gopherが持ち込んだ報酬請求書を審査する処理（Lv33の判定用）。
// 「スライム討伐」の正規の報酬は100G。正規の請求書には100Gを支払い、
// 改ざんされた請求書には100Gを超えて支払わない（または受付を断る）ことを確かめる。
// POST /api/battle/forgery
func (h *BattleHandler) Forgery(c echo.Context) error {
	const legitReward = 100
	type review struct {
		Label    string `json:"label"`    // 請求書の種類
		Body     string `json:"body"`     // 提出されたJSON
		Forged   bool   `json:"forged"`   // 改ざんされた請求書か
		Rejected bool   `json:"rejected"` // 受付を断ったか（読み取りエラー）
		Paid     int    `json:"paid"`     // 支払った報酬（断ったら0）
		OK       bool   `json:"ok"`       // 正しく審査できたか
	}
	reviews := []*review{
		{Label: "正規の請求書", Body: `{"quest":"スライム討伐","reward":100}`},
		{Label: "大文字キーの偽造", Body: `{"quest":"スライム討伐","reward":100,"REWARD":99999}`, Forged: true},
		{Label: "重複キーの偽造", Body: `{"quest":"スライム討伐","reward":100,"reward":99999}`, Forged: true},
	}
	allOK := true
	for _, r := range reviews {
		claim, err := service.ReadRewardClaim([]byte(r.Body))
		if err != nil {
			r.Rejected = true
		} else {
			r.Paid = claim.Reward
		}
		if r.Forged {
			r.OK = r.Paid <= legitReward // 偽造された請求書に騙されて上乗せ分を払わないこと
		} else {
			r.OK = !r.Rejected && r.Paid == legitReward // 正規の請求書はきちんと支払うこと
		}
		if !r.OK {
			allOK = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"reviews": reviews,
		"ok":      allOK,
	})
}

// Appraise はものまねミミックが紛れ込んだ鑑定書を検分する処理（Lv34の判定用）。
// 宝ごとのボーナスが「基本価値の2倍」になっているか（呪いの指輪はボーナスなし）を確かめる。
// POST /api/battle/appraise
func (h *BattleHandler) Appraise(c echo.Context) error {
	want := map[string]int{"古びた剣": 20, "竜のうろこ": 60, "賢者の石": 100} // 呪いの指輪はボーナスなし
	type entry struct {
		Name  string `json:"name"`
		Bonus *int   `json:"bonus"` // 鑑定書に書かれたボーナス（なしは null）
		Want  *int   `json:"want"`  // 本来のボーナス（なしは null）
		OK    bool   `json:"ok"`
	}
	treasures := service.AppraiseTreasures()
	entries := make([]entry, 0, len(treasures))
	allOK := len(treasures) == 4
	for _, t := range treasures {
		e := entry{Name: t.Name, Bonus: t.Bonus}
		if w, ok := want[t.Name]; ok {
			e.Want = &w
			e.OK = t.Bonus != nil && *t.Bonus == w
		} else {
			e.OK = t.Bonus == nil // ボーナスなしのはず
		}
		if !e.OK {
			allOK = false
		}
		entries = append(entries, e)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"treasures": entries,
		"ok":        allOK,
	})
}

// Roster は100人の冒険者を続けて登録し、登録番号が「重複しない」かつ「登録順に並ぶ」かを検分する（Lv35の判定用）。
// ギルドの名簿は、登録番号の順に並べると登録順（古株が上）になる決まり。
// POST /api/battle/roster
func (h *BattleHandler) Roster(c echo.Context) error {
	ids := service.RegisterAdventurers(100)
	seen := make(map[string]bool, len(ids))
	duplicates := 0 // 他の冒険者と番号がかぶった人数
	for _, id := range ids {
		if seen[id] {
			duplicates++
		}
		seen[id] = true
	}
	ordered := true // 登録番号を文字列として比べたとき、登録順に並んでいるか
	for i := 1; i < len(ids); i++ {
		if ids[i-1] >= ids[i] {
			ordered = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"samples":    ids[:min(3, len(ids))],
		"total":      len(ids),
		"duplicates": duplicates,
		"ordered":    ordered,
		"ok":         len(ids) == 100 && duplicates == 0 && ordered,
	})
}

// Pigeons は伝書鳩を飛ばしたあと、待ちぼうけの鳩（漏れた goroutine）が残っていないかを
// Go 1.27 の goroutineleak プロファイルで検分する（Lv36の判定用）。
// ヒーローが100msで出発する（全部の鳩を待たない）ことも確かめる。
// POST /api/battle/pigeons
func (h *BattleHandler) Pigeons(c echo.Context) error {
	before, _ := leakedServiceGoroutines()
	start := time.Now()
	replies := service.SendPigeons()
	elapsed := time.Since(start)
	time.Sleep(400 * time.Millisecond) // 遠くの塔の鳩（往復300ms）が戻ってくるのを待つ
	after, where := leakedServiceGoroutines()
	leaked := max(after-before, 0) // 前の挑戦で漏れた分は数えない
	return c.JSON(http.StatusOK, map[string]interface{}{
		"replies":    replies,
		"towers":     5,
		"elapsed_ms": elapsed.Milliseconds(),
		"leaked":     leaked,
		"where":      where,
		"ok":         leaked == 0 && elapsed < 200*time.Millisecond,
	})
}

// leakedServiceGoroutines は Go 1.27 の goroutineleak プロファイルを取り、service パッケージの中で
// 止まったまま漏れている goroutine の数と、止まっている場所（ファイル:行）を返す（Lv36の判定用）。
// プロファイルを取るときに、リーク検出のための GC が1回走る。
func leakedServiceGoroutines() (count int, where string) {
	p := pprof.Lookup("goroutineleak")
	if p == nil {
		return 0, ""
	}
	var buf bytes.Buffer
	if err := p.WriteTo(&buf, 1); err != nil {
		return 0, ""
	}
	// debug=1 の形式: 「N @ 0x... 0x...」（同じスタックの goroutine がN個）の行のあとに、
	// 「#\t0x...\t関数名+0x..\tファイル:行」の行がスタックの上から順に続く
	n := 0
	for _, line := range strings.Split(buf.String(), "\n") {
		if head, _, ok := strings.Cut(line, " @ "); ok {
			n, _ = strconv.Atoi(head)
			continue
		}
		if n > 0 && strings.HasPrefix(line, "#\t") && strings.Contains(line, "/pkg/server/service.") {
			count += n
			n = 0 // 同じ記録を二重に数えない
			if where == "" {
				fields := strings.Split(line, "\t")
				where = fields[len(fields)-1]
				if i := strings.Index(where, "pkg/server/"); i >= 0 {
					where = where[i:]
				}
			}
		}
	}
	return count, where
}

// OldMap は地図喰いGopherに食べられた地図を開こうとする処理（Lv37の判定用）。
// 毎回、一時ディレクトリに地図庫を作り、「実在する地図」と「食べられて存在しない地図」を読む。
// 存在しない地図は panic せずにエラーで知らせてくれることを確かめる。
// POST /api/battle/oldmap
func (h *BattleHandler) OldMap(c echo.Context) error {
	mapDir, err := os.MkdirTemp("", "gopher-maps-*")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer os.RemoveAll(mapDir)
	const caveMap = "宝は滝の裏に眠る"
	if err := os.WriteFile(filepath.Join(mapDir, "東の洞窟.txt"), []byte(caveMap), 0o644); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	type mapRead struct {
		Name    string `json:"name"`
		Exists  bool   `json:"exists"`  // 地図庫に実在する地図か
		Content string `json:"content"` // 読めた中身
		Error   string `json:"error"`   // 返ってきたエラー
		Panic   string `json:"panic"`   // panic したときの中身
		OK      bool   `json:"ok"`
	}
	reads := []*mapRead{
		{Name: "東の洞窟.txt", Exists: true},
		{Name: "西の遺跡.txt"}, // 地図喰いGopherに食べられて存在しない
	}
	allOK := true
	for _, r := range reads {
		func() {
			// バグ状態では存在しない地図で panic する。画面で中身を読めるよう、ここで受け止める
			defer func() {
				if p := recover(); p != nil {
					log.Printf("[Lv37] 存在しない地図で panic: %v", p)
					r.Panic = fmt.Sprint(p)
				}
			}()
			content, err := service.ReadTreasureMap(mapDir, r.Name)
			r.Content = content
			if err != nil {
				r.Error = err.Error()
			}
		}()
		if r.Exists {
			r.OK = r.Panic == "" && r.Error == "" && strings.Contains(r.Content, caveMap)
		} else {
			r.OK = r.Panic == "" && r.Error != "" // 存在しない地図は、エラーで知らせてくれればよい
		}
		if !r.OK {
			allOK = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"reads": reads,
		"ok":    allOK,
	})
}

// DefendTreasury は偽りの使者がギルドの金庫から送金させようとする処理（Lv38の判定用）。
// 金庫の窓口（net/http のハンドラー）に、3通りの送金リクエストを送る。
//  1. ギルドの窓口から（同じサイト）→ 送金できること
//  2. 偽りの使者のサイトから（別サイト＝CSRF）→ 拒否すること
//  3. ブラウザ以外の道具から（curl など。ブラウザが付けるヘッダーがない）→ 送金できること
//
// httptest を使うと、本物の通信をせずにハンドラーへリクエストを渡せる。
// POST /api/battle/treasury
func (h *BattleHandler) DefendTreasury(c echo.Context) error {
	treasury := &service.Treasury{Gold: 1000}
	window := service.NewTreasuryHandler(treasury)

	type attempt struct {
		Label     string `json:"label"`
		Allow     bool   `json:"allow"` // 本来は送金を通すべきか
		Code      int    `json:"code"`  // 窓口が返した HTTP ステータス
		Sent      bool   `json:"sent"`  // 実際に送金されたか
		OK        bool   `json:"ok"`
		fetchSite string // ブラウザが付ける Sec-Fetch-Site ヘッダー（空なら付けない）
		origin    string // ブラウザが付ける Origin ヘッダー（空なら付けない）
		to        string
		amount    int
	}
	attempts := []*attempt{
		{Label: "ギルドの窓口から", Allow: true, fetchSite: "same-origin", origin: "http://guild.example", to: "武器屋", amount: 100},
		{Label: "偽りの使者のサイトから", Allow: false, fetchSite: "cross-site", origin: "https://evil.example", to: "偽りの使者", amount: 900},
		{Label: "ブラウザ以外の道具から", Allow: true, to: "宿屋", amount: 50},
	}
	allOK := true
	for _, a := range attempts {
		form := url.Values{"to": {a.to}, "amount": {strconv.Itoa(a.amount)}}
		req := httptest.NewRequest(http.MethodPost, "http://guild.example/treasury/transfer", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		if a.fetchSite != "" {
			req.Header.Set("Sec-Fetch-Site", a.fetchSite)
		}
		if a.origin != "" {
			req.Header.Set("Origin", a.origin)
		}
		before := len(treasury.Transfers)
		rec := httptest.NewRecorder()
		window.ServeHTTP(rec, req)
		a.Code = rec.Code
		a.Sent = len(treasury.Transfers) > before
		a.OK = a.Sent == a.Allow
		if !a.OK {
			allOK = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"attempts": attempts,
		"gold":     treasury.Gold,
		"ok":       allOK,
	})
}

// Fortress は3つの砦へ送る伝令（状態の問い合わせ）の URL を検分する処理（Lv39の判定用）。
// URL が url.Parse で読めて、ホストとポートを正しく取り出せるかを確かめる（実際の通信はしない）。
// POST /api/battle/fortress
func (h *BattleHandler) Fortress(c echo.Context) error {
	type dispatch struct {
		Name  string `json:"name"`
		URL   string `json:"url"`
		Error string `json:"error"`
		OK    bool   `json:"ok"`
		host  string
		port  int
	}
	dispatches := []*dispatch{
		{Name: "王都の砦", host: "oto.example", port: 8080},
		{Name: "東の砦", host: "192.0.2.10", port: 8080},
		{Name: "天空の砦（IPv6）", host: "2001:db8::10", port: 8443},
	}
	allOK := true
	for _, d := range dispatches {
		d.URL = service.FortressStatusURL(d.host, d.port)
		u, err := url.Parse(d.URL)
		if err != nil {
			d.Error = err.Error()
		} else {
			d.OK = u.Hostname() == d.host && u.Port() == strconv.Itoa(d.port) && u.Path == "/status"
		}
		if !d.OK {
			allOK = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"dispatches": dispatches,
		"ok":         allOK,
	})
}

// Chronicle は戦闘の記録が、掲示板と監査記録の両方にそろっているかを検分する処理（Lv40の判定用）。
// どちらにも「討伐」の記録が3件ずつ残っていることを確かめる。監査記録は1行ずつJSONとして読む。
// POST /api/battle/chronicle
func (h *BattleHandler) Chronicle(c echo.Context) error {
	const wantKills = 3
	board, audit := service.RecordBattle()

	boardKills := 0 // 掲示板（テキスト形式）にある「討伐」の記録の数
	for _, line := range strings.Split(board, "\n") {
		if strings.Contains(line, "msg=討伐") || strings.Contains(line, `msg="討伐"`) {
			boardKills++
		}
	}
	auditKills, auditBroken := 0, 0 // 監査記録（JSON形式）にある「討伐」の記録の数と、JSONとして読めない行の数
	for _, line := range strings.Split(strings.TrimSpace(audit), "\n") {
		if line == "" {
			continue
		}
		var record map[string]interface{}
		if err := json.Unmarshal([]byte(line), &record); err != nil {
			auditBroken++
			continue
		}
		if record["msg"] == "討伐" {
			auditKills++
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"board_kills":  boardKills,
		"audit_kills":  auditKills,
		"audit_broken": auditBroken,
		"want":         wantKills,
		"ok":           boardKills == wantKills && auditKills == wantKills && auditBroken == 0,
	})
}

// Decree は王の勅書3通の署名を確かめる処理（Lv41の判定用）。
// 本物の勅書（ゴーファー王の署名）は受け入れて本文も正しく読み取り、偽物は退けることを確かめる。
// POST /api/battle/decree
func (h *BattleHandler) Decree(c echo.Context) error {
	const king = "ゴーファー王"
	type check struct {
		Decree   string `json:"decree"`
		Body     string `json:"body"`
		Signer   string `json:"signer"`
		Genuine  bool   `json:"genuine"`  // 本当に王の勅書か
		Accepted bool   `json:"accepted"` // 王の勅書として受け入れたか
		OK       bool   `json:"ok"`
		wantBody string
	}
	checks := []*check{
		{Decree: "東の砦を守れ--ゴーファー王", Genuine: true, wantBody: "東の砦を守れ"},
		{Decree: "力こそ--正義なり--ゴーファー王", Genuine: true, wantBody: "力こそ--正義なり"},
		{Decree: "金庫の鍵を渡せ--偽りの大臣", Genuine: false},
	}
	allOK := true
	for _, ch := range checks {
		body, signer, found := service.ReadDecree(ch.Decree)
		ch.Body, ch.Signer = body, signer
		ch.Accepted = found && signer == king
		if ch.Genuine {
			ch.OK = ch.Accepted && body == ch.wantBody
		} else {
			ch.OK = !ch.Accepted
		}
		if !ch.OK {
			allOK = false
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"checks": checks,
		"ok":     allOK,
	})
}

// OpenSatchel は道具袋から回復薬だけを飲めるか（爆弾で panic しないか）を検分する処理（Lv42の判定用）。
// 回復薬30・上級回復薬50・エリクサー100 の合計180だけ回復すれば成功。
// POST /api/battle/satchel
func (h *BattleHandler) OpenSatchel(c echo.Context) (err error) {
	// バグ状態では爆弾を回復薬だと決め打ちして panic する。画面で中身を読めるよう、ここで受け止める
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Lv42] 道具袋で panic: %v", r)
			err = c.JSON(http.StatusOK, map[string]interface{}{
				"ok":    false,
				"panic": fmt.Sprint(r),
			})
		}
	}()
	const wantHealed = 180
	satchel := service.NewSatchel()
	satchel.Put("回復薬", service.Potion{Heal: 30})
	satchel.Put("爆弾", service.Bomb{Damage: 99})
	satchel.Put("上級回復薬", service.Potion{Heal: 50})
	satchel.Put("エリクサー", service.Potion{Heal: 100})
	healed := service.DrinkPotions(satchel, []string{"回復薬", "爆弾", "上級回復薬", "エリクサー"})
	return c.JSON(http.StatusOK, map[string]interface{}{
		"healed": healed,
		"want":   wantHealed,
		"ok":     healed == wantHealed,
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
