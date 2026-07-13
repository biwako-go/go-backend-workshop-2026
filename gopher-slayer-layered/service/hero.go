package service

import (
	"errors"

	"github.com/maropook/gopher-slayer-layered/entity"
	"github.com/maropook/gopher-slayer-layered/repository"
)

type HeroService struct {
	heroRepo *repository.HeroRepository
}

func NewHeroService(heroRepo *repository.HeroRepository) *HeroService {
	return &HeroService{heroRepo: heroRepo}
}

func (s *HeroService) Get() (*entity.Hero, error) {
	return s.heroRepo.Get()
}

func (s *HeroService) UpdateName(name string) error {
	if name == "" {
		return errors.New("name is required")
	}
	return s.heroRepo.UpdateName(name)
}

func (s *HeroService) UpdateExperience(experience int) error {
	return s.heroRepo.UpdateExperience(experience)
}

func (s *HeroService) UpdateHP(hp int) error {
	if hp <= 0 {
		return errors.New("hp must be greater than 0")
	}
	return s.heroRepo.UpdateHP(hp)
}
