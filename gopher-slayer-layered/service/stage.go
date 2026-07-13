package service

import (
	"fmt"

	"github.com/maropook/gopher-slayer-layered/entity"
	"github.com/maropook/gopher-slayer-layered/repository"
)

type StageService struct {
	stageRepo *repository.StageRepository
	enemyRepo *repository.EnemyRepository
	heroRepo  *repository.HeroRepository
}

func NewStageService(stageRepo *repository.StageRepository, enemyRepo *repository.EnemyRepository, heroRepo *repository.HeroRepository) *StageService {
	return &StageService{
		stageRepo: stageRepo,
		enemyRepo: enemyRepo,
		heroRepo:  heroRepo,
	}
}

func (s *StageService) GetStagesWithUnlockStatus() ([]*entity.Stage, error) {
	hero, err := s.heroRepo.Get()
	if err != nil {
		return nil, err
	}
	stages, err := s.stageRepo.GetAll()
	if err != nil {
		return nil, err
	}
	for _, stage := range stages {
		stage.IsUnlocked = hero.Experience >= stage.RequiredExperience
	}
	return stages, nil
}

func (s *StageService) GetEnemiesByStage(stageID int) ([]*entity.Enemy, error) {
	return s.enemyRepo.GetByStageID(stageID)
}

type ClearStageResult struct {
	Message          string `json:"message"`
	ExperienceGained int    `json:"experience_gained"`
	NewExperience    int    `json:"new_experience"`
}

func (s *StageService) ClearStage(stageID int) (*ClearStageResult, error) {
	stage, err := s.stageRepo.GetByID(stageID)
	if err != nil {
		return nil, fmt.Errorf("stage not found")
	}

	hero, err := s.heroRepo.Get()
	if err != nil {
		return nil, fmt.Errorf("failed to get hero")
	}

	expGained, err := s.enemyRepo.GetTotalExpForStage(stageID)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate experience")
	}

	newExp := hero.Experience + expGained
	if err := s.heroRepo.UpdateExperience(newExp); err != nil {
		return nil, fmt.Errorf("failed to update experience")
	}

	return &ClearStageResult{
		Message:          fmt.Sprintf("Stage '%s' cleared!", stage.Name),
		ExperienceGained: expGained,
		NewExperience:    newExp,
	}, nil
}
