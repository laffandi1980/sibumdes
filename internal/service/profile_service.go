package service

import (
	"errors"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
)

func GetAllProfiles(requesterProfileID *uint) ([]models.ProfileBUMDes, error) {
	profiles, err := repository.GetAllProfiles(requesterProfileID)
	if err != nil {
		return nil, err
	}
	if profiles == nil {
		return []models.ProfileBUMDes{}, nil
	}
	return profiles, nil
}

func GetProfileByID(id uint, requesterProfileID *uint) (*models.ProfileBUMDes, error) {
	profile, err := repository.GetProfileByID(id, requesterProfileID)
	if err != nil {
		return nil, err
	}
	return profile, nil
}

func GetProfileBySlug(slug string, requesterProfileID *uint) (*models.ProfileBUMDes, error) {
	profile, err := repository.GetProfileBySlug(slug, requesterProfileID)
	if err != nil {
		return nil, err
	}
	return profile, nil
}

func DeleteProfile(id uint, requesterProfileID *uint) error {
	return repository.DeleteProfile(id, requesterProfileID)
}

func DeleteUnitUsaha(id uint) error {
	return repository.DeleteUnitUsaha(id)
}

func SaveProfile(profile *models.ProfileBUMDes) error {
	// Business validation logic can go here
	if profile.NamaBUMDes == "" {
		return errors.New("Nama BUMDes is required")
	}

	return repository.SaveProfile(profile)
}
