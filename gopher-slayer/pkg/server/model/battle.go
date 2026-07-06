package model

import (
	"fmt"
	"math/rand"
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

// EnemyAttack は敵の攻撃ダメージを計算して返す。
//
// [Lv4 バグ仕込み箇所]
// バグ版では time.Sleep(3*time.Second) が追加され、
// かつダメージが負になりヒーローが回復してしまう。
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
	damage := CalculateDamage(req.EnemyAttack)
	return AttackResponse{
		Damage:  damage,
		Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
	}
}
