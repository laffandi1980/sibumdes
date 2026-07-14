package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetAllBarangJasa(requesterProfileID *uint) ([]models.BarangJasa, error) {
	var barangJasa []models.BarangJasa
	query := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes")
	if requesterProfileID != nil {
		query = query.Where(&models.BarangJasa{ProfileBUMDesID: requesterProfileID})
	}
	err := query.Order("created_at desc").Find(&barangJasa).Error
	return barangJasa, err
}

func GetBarangJasaBySlug(slug string) (*models.BarangJasa, error) {
	var barangJasa models.BarangJasa
	err := config.DB.Where("slug = ?", slug).First(&barangJasa).Error
	return &barangJasa, err
}

func GetLastBarangJasaByUnit(unitID uint) (*models.BarangJasa, error) {
	var barangJasa models.BarangJasa
	err := config.DB.Where("unit_usaha_id = ?", unitID).Order("id desc").First(&barangJasa).Error
	return &barangJasa, err
}

func SaveBarangJasa(barangJasa *models.BarangJasa) error {
	if barangJasa.ID == 0 {
		return config.DB.Create(barangJasa).Error
	}
	return config.DB.Save(barangJasa).Error
}

func DeleteBarangJasaBySlug(slug string) error {
	return config.DB.Where("slug = ?", slug).Delete(&models.BarangJasa{}).Error
}
