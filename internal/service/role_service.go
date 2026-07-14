package service

import (
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
)

func GetAllRoles() ([]models.Role, error) {
	return repository.GetAllRoles()
}

func GetRoleByID(id uint) (*models.Role, error) {
	return repository.GetRoleByID(id)
}

func SaveRole(role *models.Role) error {
	return repository.SaveRole(role)
}

func DeleteRole(id uint) error {
	return repository.DeleteRole(id)
}
