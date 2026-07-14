package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetAllBarang(requesterProfileID *uint) ([]models.Barang, error) {
	var barang []models.Barang
	query := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes")
	if requesterProfileID != nil {
		query = query.Where(&models.Barang{ProfileBUMDesID: requesterProfileID})
	}
	err := query.Order("created_at desc").Find(&barang).Error
	return barang, err
}

func GetBarangByID(id uint) (*models.Barang, error) {
	var barang models.Barang
	err := config.DB.First(&barang, id).Error
	return &barang, err
}

func GetBarangBySlug(slug string) (*models.Barang, error) {
	var barang models.Barang
	err := config.DB.Where("slug = ?", slug).First(&barang).Error
	return &barang, err
}

func GetLastBarang() (*models.Barang, error) {
	var barang models.Barang
	err := config.DB.Order("id desc").First(&barang).Error
	return &barang, err
}

func GetLastBarangByUnit(unitID uint) (*models.Barang, error) {
	var barang models.Barang
	err := config.DB.Where("unit_usaha_id = ?", unitID).Order("id desc").First(&barang).Error
	return &barang, err
}

func SaveBarang(barang *models.Barang) error {
	if barang.ID == 0 {
		return config.DB.Create(barang).Error
	}
	return config.DB.Save(barang).Error
}

func DeleteBarangBySlug(slug string) error {
	return config.DB.Where("slug = ?", slug).Delete(&models.Barang{}).Error
}
