package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetAllUsers(requesterProfileID *uint) ([]models.User, error) {
	if config.DB == nil {
		return nil, nil
	}
	var users []models.User
	query := config.DB.Preload("Role").Preload("ProfileBUMDes")
	if requesterProfileID != nil {
		query = query.Where(&models.User{ProfileBUMDesID: requesterProfileID})
	}
	err := query.Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

func GetUserByID(id uint) (*models.User, error) {
	if config.DB == nil {
		return nil, nil
	}
	var user models.User
	err := config.DB.Preload("Role").First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserBySlug(slug string) (*models.User, error) {
	if config.DB == nil {
		return nil, nil
	}
	var user models.User
	err := config.DB.Preload("Role").Preload("ProfileBUMDes").Where("slug = ?", slug).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func DeleteUser(id uint) error {
	if config.DB == nil {
		return nil
	}
	return config.DB.Delete(&models.User{}, id).Error
}

func SaveUser(user *models.User) error {
	if config.DB == nil {
		return nil
	}

	if user.ID != 0 {
		var existing models.User
		config.DB.Select("created_at").First(&existing, user.ID)
		if !existing.CreatedAt.IsZero() {
			user.CreatedAt = existing.CreatedAt
		}
		return config.DB.Save(user).Error
	}
	return config.DB.Create(user).Error
}
