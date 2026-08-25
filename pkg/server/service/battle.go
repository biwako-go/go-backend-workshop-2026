package service

import (
	"fmt"
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
	return attack * 3
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
		Message: fmt.Sprintf("%d ダメージを与えた！", damage),
	}
}

// ApplyDamage はダメージを適用し、HP（0以上）を返す。
//
// [Lv7 バグ仕込み箇所]
// テストを書いてバグを見つけよう。
func ApplyDamage(currentHP, damage int) int {
	if currentHP-damage < 0 {
		return 1 // ← バグ: 0 にすべき
	}
	return currentHP - damage
}

// EnemyAttack は敵の攻撃ダメージを計算して返す。
//
// [Lv5 バグ仕込み箇所]
// ボスドラゴンの攻撃だけなぜか遅い。ハンドラー層も確認しよう。
func EnemyAttack(req EnemyAttackRequest) AttackResponse {
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
