package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetAllInventaris(requesterProfileID *uint) ([]models.Inventaris, error) {
	var items []models.Inventaris
	query := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes")
	if requesterProfileID != nil {
		query = query.Where(&models.Inventaris{ProfileBUMDesID: requesterProfileID})
	}
	err := query.Order("created_at desc").Find(&items).Error
	return items, err
}

func GetInventarisBySlug(slug string) (*models.Inventaris, error) {
	var item models.Inventaris
	err := config.DB.Preload("UnitUsaha").Where("slug = ?", slug).First(&item).Error
	return &item, err
}

func GetLastInventarisByUnit(unitID uint) (*models.Inventaris, error) {
	var item models.Inventaris
	err := config.DB.Where("unit_usaha_id = ?", unitID).Order("id desc").First(&item).Error
	return &item, err
}

func SaveInventaris(item *models.Inventaris) error {
	if item.ID == 0 {
		return config.DB.Create(item).Error
	}
	return config.DB.Save(item).Error
}

func DeleteInventarisBySlug(slug string) error {
	return config.DB.Where("slug = ?", slug).Delete(&models.Inventaris{}).Error
}
