package service

import (
	"fmt"
	"math/rand"
	"time"
)

type AttackRequest struct {
	HeroAttack int    `json:"hero_attack"`
	EnemyName  string `json:"enemy_name"`
}

type AttackResponse struct {
	Damage    int    `json:"damage"`
	NewHeroHP int    `json:"new_hero_hp"`
	Message   string `json:"message"`
}

type EnemyAttackRequest struct {
	EnemyAttack int    `json:"enemy_attack"`
	EnemyName   string `json:"enemy_name"`
	HeroHP      int    `json:"hero_hp"`
}

// CalculateDamage は攻撃力をもとにダメージを計算する。
//
// [Lv1 バグ仕込み箇所]
// この関数を完成させてください。
func CalculateDamage(attack int) int {
	return 0
}

// CalculateEnemyDamage は敵の攻撃力をもとにダメージを計算する。
func CalculateEnemyDamage(attack int) int {
	return attack
}

// grudges は倒した敵の怨念。
//
// [Lv23 バグ仕込み箇所]
// グローバル変数に参照が残り続けるため、GCがメモリを回収できない。
// 戦うたびに5MBずつサーバーのメモリが増え続ける（メモリリーク）。
// 怨念を溜め込む処理を削除するのが正解。
var grudges [][]byte

// criticalRNG はクリティカル判定用の乱数生成器。
//
// [Lv28 バグ仕込み箇所]
// 古い math/rand を「固定シード」で使っているため、乱数が完全に予測可能になっている
// （予言者チャレンジで全的中されてしまう＝チート可能）。
// Go 1.22 の math/rand/v2 に移行しよう。v2 は自動でシードされるので
// この変数ごと削除して rand.IntN(4) == 0 と書けばよい。
var criticalRNG = rand.New(rand.NewSource(1))

// RollCritical は攻撃がクリティカルヒット（4分の1の確率）かどうかを判定する。
func RollCritical() bool {
	return criticalRNG.Intn(4) == 0
}

// HeroAttack はヒーローの攻撃ダメージを計算して返す。
func HeroAttack(req AttackRequest) AttackResponse {
	damage := CalculateDamage(req.HeroAttack)
	grudges = append(grudges, make([]byte, 5*1024*1024)) // 敵の怨念（5MB）が溜まっていく
	message := fmt.Sprintf("%d ダメージを与えた！", damage)
	if RollCritical() {
		damage *= 2
		message = fmt.Sprintf("会心の一撃！%d ダメージを与えた！", damage)
	}
	return AttackResponse{
		Damage:  damage,
		Message: message,
	}
}

// BuildBattleReport は戦闘ログをつなげて1つの討伐報告書にまとめる。
//
// [Lv26 バグ仕込み箇所]
// 文字列の += 連結は毎回新しい文字列を作り直すため、ログが多いと遅い。
// go test -bench で計測してから、strings.Builder で書き換えよう。
func BuildBattleReport(logs []string) string {
	report := ""
	for _, log := range logs {
		report += log + "\n"
	}
	return report
}

// ApplyDamage はダメージを適用し、HP（0以上）を返す。
//
// [Lv10 バグ仕込み箇所]
// テストを書いてバグを見つけよう。
func ApplyDamage(currentHP, damage int) int {
	if currentHP-damage < 0 {
		return 1 // ← バグ: 0 にすべき
	}
	return currentHP - damage
}

// spiritGate は悪霊の門。誰も閉じることがない。
//
// [Lv22 バグ仕込み箇所]
// 敵の攻撃のたびに悪霊（goroutine）が召喚されるが、閉じられることのない
// 門（channel）を永遠に待ち続けるため、goroutine が増え続ける（リーク）。
// GET /api/debug/memory の num_goroutine で観測できる。
// summonSpirit の呼び出しを削除するのが正解（または門を close して解放する）。
var spiritGate = make(chan struct{})

func summonSpirit() {
	go func() {
		<-spiritGate // 閉じない門を待ち続ける
	}()
}

// EnemyAttack は敵の攻撃ダメージを計算して返す。
//
// [Lv5 バグ仕込み箇所]
// ボスドラゴンの攻撃だけなぜか遅い。ハンドラー層も確認しよう。
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
	summonSpirit() // 敵の攻撃とともに悪霊が漏れ出す
	damage := CalculateEnemyDamage(req.EnemyAttack)
	if req.EnemyName == "ボスドラゴン" {
		time.Sleep(3 * time.Second)
	}
	newHeroHP := ApplyDamage(req.HeroHP, damage)
	return AttackResponse{
		Damage:    damage,
		NewHeroHP: newHeroHP,
		Message:   fmt.Sprintf("%s が %d ダメージを与えた！", req.EnemyName, damage),
	}
}
