package service

import (
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
)

func GetAllUsers(reqProfileID *uint) ([]models.User, error) {
	return repository.GetAllUsers(reqProfileID)
}

func GetUserByID(id uint) (*models.User, error) {
	return repository.GetUserByID(id)
}

func GetUserBySlug(slug string) (*models.User, error) {
	return repository.GetUserBySlug(slug)
}

func SaveUser(user *models.User, profileBumdesID *uint) error {
	user.ProfileBUMDesID = profileBumdesID
	return repository.SaveUser(user)
}

func DeleteUser(id uint) error {
	return repository.DeleteUser(id)
}
