package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetAllPelanggan(requesterProfileID *uint) ([]models.Pelanggan, error) {
	var pelanggan []models.Pelanggan
	query := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes")
	if requesterProfileID != nil && *requesterProfileID != 0 {
		query = query.Where("profile_bum_des_id = ? OR profile_bum_des_id IS NULL", *requesterProfileID)
	}
	err := query.Order("created_at desc").Find(&pelanggan).Error
	return pelanggan, err
}

func GetPelangganByID(id uint) (*models.Pelanggan, error) {
	var pelanggan models.Pelanggan
	err := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes").First(&pelanggan, id).Error
	return &pelanggan, err
}

func GetPelangganBySlug(slug string) (*models.Pelanggan, error) {
	var pelanggan models.Pelanggan
	err := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes").Where("slug = ?", slug).First(&pelanggan).Error
	return &pelanggan, err
}

func GetLastPelanggan() (*models.Pelanggan, error) {
	var pelanggan models.Pelanggan
	err := config.DB.Order("id desc").First(&pelanggan).Error
	return &pelanggan, err
}

func GetLastPelangganByUnit(unitID uint) (*models.Pelanggan, error) {
	var pelanggan models.Pelanggan
	err := config.DB.Where("unit_usaha_id = ?", unitID).Order("id desc").First(&pelanggan).Error
	return &pelanggan, err
}

func SavePelanggan(pelanggan *models.Pelanggan) error {
	if pelanggan.ID == 0 {
		return config.DB.Create(pelanggan).Error
	}
	return config.DB.Save(pelanggan).Error
}

func UpdateAllPelangganLinkAkun(linkAkun string) error {
	return config.DB.Model(&models.Pelanggan{}).Where("1 = 1").Update("link_akun", linkAkun).Error
}

func DeletePelangganBySlug(slug string) error {
	return config.DB.Where("slug = ?", slug).Delete(&models.Pelanggan{}).Error
}
