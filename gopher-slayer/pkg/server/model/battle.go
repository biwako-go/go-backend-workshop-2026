package model

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

type AttackRequest struct {
	HeroAttack int `json:"hero_attack"`
}

type AttackResponse struct {
	Damage  int    `json:"damage"`
	Message string `json:"message"`
}

type EnemyAttackRequest struct {
	EnemyAttack int    `json:"enemy_attack"`
	EnemyName   string `json:"enemy_name"`
}

// CalculateDamage は攻撃力をもとにダメージを計算する。
// ±20% のランダムな誤差が加わる。
//
// [Lv1 バグ仕込み箇所]
// バグ版では return 0 に書き換えられている。
// 正しいダメージ値を返すよう修正する。
func CalculateDamage(attack int) int {
	if attack <= 0 {
		return 0
	}
	variance := int(float64(attack) * 0.2)
	if variance == 0 {
		return attack
	}
	// ダメージは [attack - variance, attack + variance] の範囲
	return attack - variance + rand.Intn(variance*2+1)
}

// HeroAttack はヒーローの攻撃ダメージを計算して返す。
func HeroAttack(req AttackRequest) AttackResponse {
	damage := CalculateDamage(req.HeroAttack)
	return AttackResponse{
		Damage:  damage,
		Message: fmt.Sprintf("You dealt %d damage!", damage),
	}
}

// CalcLevel は経験値からヒーローのレベルを計算する。
//
// [Lv5 バグ仕込み箇所]
// experience が 100 未満のケースしか実装されていないため、
// どれだけ経験値が増えても Lv1 のまま変わらない。
// テストを書いて問題を発見し、100以上のケースを実装しよう。
func CalcLevel(experience int) int {
	if experience < 100 {
		return 1
	}
	return 1 // バグ: 100以上のケースが未実装
}

type BreakSealsRequest struct {
	Attacks []int `json:"attacks"`
}

type BreakSealsResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Damages []int  `json:"damages"`
}

// BreakSeals はボスを守る複数の封印を同時に解く。
// 封印はそれぞれ1秒かかる。2秒以内に全部解かないとボスのHPが回復してしまう。
//
// [Lv6 バグ仕込み箇所]
// バグ版では封印を順番に解いているため、3つで3秒かかり時間制限に引っかかる。
// goroutine と sync.WaitGroup を使って並列化することで1秒以内に完了する。
func BreakSeals(req BreakSealsRequest) BreakSealsResponse {
	start := time.Now()
	damages := make([]int, len(req.Attacks))

	// バグ: 順番に処理しているため封印の数だけ時間がかかる
	for i, atk := range req.Attacks {
		time.Sleep(1 * time.Second)
		damages[i] = CalculateDamage(atk)
	}

	_ = sync.WaitGroup{} // ヒント: sync.WaitGroup を使おう

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

// EnemyAttack は敵の攻撃ダメージを計算して返す。
//
// [Lv4 バグ仕込み箇所]
// バグ版では time.Sleep(3*time.Second) が追加されており、
// 攻撃が来るまで数秒かかる。
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
	damage := CalculateDamage(req.EnemyAttack)
	return AttackResponse{
		Damage:  damage,
		Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
	}
}
