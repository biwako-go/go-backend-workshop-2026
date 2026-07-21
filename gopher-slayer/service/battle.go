package service

import (
	"fmt"
	"math/rand"
)

type BattleService struct{}

func NewBattleService() *BattleService {
	return &BattleService{}
}

type AttackResult struct {
	Damage  int    `json:"damage"`
	Message string `json:"message"`
}

func (s *BattleService) HeroAttack(heroAttack int) AttackResult {
	damage := s.calculateDamage(heroAttack)
	return AttackResult{
		Damage:  damage,
		Message: fmt.Sprintf("You dealt %d damage!", damage),
	}
}

func (s *BattleService) EnemyAttack(enemyAttack int, enemyName string) AttackResult {
	damage := s.calculateDamage(enemyAttack)
	return AttackResult{
		Damage:  damage,
		Message: fmt.Sprintf("%s dealt %d damage!", enemyName, damage),
	}
}

// calculateDamage は攻撃力をもとにダメージを計算する。±20% のランダムな誤差が加わる。
func (s *BattleService) calculateDamage(attack int) int {
	if attack <= 0 {
		return 0
	}
	variance := int(float64(attack) * 0.2)
	if variance == 0 {
		return attack
	}
	return attack - variance + rand.Intn(variance*2+1)
}
