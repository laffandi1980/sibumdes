package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetAllSupplier(requesterProfileID *uint) ([]models.Supplier, error) {
	var supplier []models.Supplier
	query := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes")
	if requesterProfileID != nil {
		query = query.Where(&models.Supplier{ProfileBUMDesID: requesterProfileID})
	}
	err := query.Order("created_at desc").Find(&supplier).Error
	return supplier, err
}

func GetSupplierByID(id uint) (*models.Supplier, error) {
	var supplier models.Supplier
	err := config.DB.First(&supplier, id).Error
	return &supplier, err
}

func GetSupplierBySlug(slug string) (*models.Supplier, error) {
	var supplier models.Supplier
	err := config.DB.Where("slug = ?", slug).First(&supplier).Error
	return &supplier, err
}

func GetLastSupplier() (*models.Supplier, error) {
	var supplier models.Supplier
	err := config.DB.Order("id desc").First(&supplier).Error
	return &supplier, err
}

func GetLastSupplierByUnit(unitID uint) (*models.Supplier, error) {
	var supplier models.Supplier
	err := config.DB.Where("unit_usaha_id = ?", unitID).Order("id desc").First(&supplier).Error
	return &supplier, err
}

func SaveSupplier(supplier *models.Supplier) error {
	if supplier.ID == 0 {
		return config.DB.Create(supplier).Error
	}
	return config.DB.Save(supplier).Error
}

func DeleteSupplierBySlug(slug string) error {
	return config.DB.Where("slug = ?", slug).Delete(&models.Supplier{}).Error
}
