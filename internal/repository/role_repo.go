package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetAllRoles() ([]models.Role, error) {
	if config.DB == nil {
		return nil, nil
	}
	var roles []models.Role
	err := config.DB.Find(&roles).Error
	if err != nil {
		return nil, err
	}
	return roles, nil
}

func GetRoleByID(id uint) (*models.Role, error) {
	if config.DB == nil {
		return nil, nil
	}
	var role models.Role
	err := config.DB.First(&role, id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func DeleteRole(id uint) error {
	if config.DB == nil {
		return nil
	}
	return config.DB.Delete(&models.Role{}, id).Error
}

func SaveRole(role *models.Role) error {
	if config.DB == nil {
		return nil
	}

	if role.ID != 0 {
		var existing models.Role
		config.DB.Select("created_at").First(&existing, role.ID)
		if !existing.CreatedAt.IsZero() {
			role.CreatedAt = existing.CreatedAt
		}
		return config.DB.Save(role).Error
	}
	return config.DB.Create(role).Error
}
