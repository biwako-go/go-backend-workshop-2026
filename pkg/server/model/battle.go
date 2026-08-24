package model

import (
	"fmt"
	"time"
)

type AttackRequest struct {
	HeroAttack int    `json:"hero_attack"`
	EnemyName  string `json:"enemy_name"`
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

// HeroAttack はヒーローの攻撃ダメージを計算して返す。
func HeroAttack(req AttackRequest) AttackResponse {
	damage := CalculateDamage(req.HeroAttack)
	return AttackResponse{
		Damage:  damage,
		Message: fmt.Sprintf("You dealt %d damage!", damage),
	}
}

// ApplyDamage はダメージを適用し、HP（0以上）を返す。
//
// [Lv6 バグ仕込み箇所]
// テストを書いてバグを見つけよう。
func ApplyDamage(currentHP, damage int) int {
	if currentHP-damage < 0 {
		return 1 // ← バグ: 0 にすべき
	}
	return currentHP - damage
}

// EnemyAttack は敵の攻撃ダメージを計算して返す。
//
// [Lv4 バグ仕込み箇所]
// バグが仕込まれている。コードをよく読んで見つけよう。
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
	time.Sleep(3 * time.Second)
	damage := -CalculateEnemyDamage(req.EnemyAttack)
	return AttackResponse{
		Damage:  damage,
		Message: fmt.Sprintf("%s dealt %d damage!", req.EnemyName, damage),
	}
}
