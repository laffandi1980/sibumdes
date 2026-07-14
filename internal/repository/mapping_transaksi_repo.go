package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"

	"gorm.io/gorm"
)

func GetAllMappingTransaksi(profileID *uint, jenisMapping string) ([]models.MappingTransaksi, error) {
	var items []models.MappingTransaksi
	query := config.DB.
		Preload("UnitUsaha").
		Preload("ProfileBUMDes").
		Preload("Details", func(db *gorm.DB) *gorm.DB { return db.Order("urutan ASC, id ASC") })
	if profileID != nil {
		query = query.Where("(profile_bum_des_id = ? OR profile_bum_des_id IS NULL)", *profileID)
	}
	if jenisMapping != "" {
		query = query.Where("jenis_mapping = ?", jenisMapping)
	}
	err := query.Order("unit_usaha_id IS NULL, unit_usaha_id ASC, created_at ASC, id ASC").Find(&items).Error
	return items, err
}

func GetMappingTransaksiBySlug(slug string, profileID *uint, jenisMapping string) (*models.MappingTransaksi, error) {
	var item models.MappingTransaksi
	query := config.DB.
		Preload("UnitUsaha").
		Preload("Details", func(db *gorm.DB) *gorm.DB { return db.Order("urutan ASC, id ASC") }).
		Where("slug = ?", slug)
	if profileID != nil {
		query = query.Where("(profile_bum_des_id = ? OR profile_bum_des_id IS NULL)", *profileID)
	}
	if jenisMapping != "" {
		query = query.Where("jenis_mapping = ?", jenisMapping)
	}
	err := query.First(&item).Error
	return &item, err
}

func SaveMappingTransaksi(item *models.MappingTransaksi) error {
	// Pisahkan details agar kita dapat mengganti seluruh baris jurnal
	// secara atomik (delete-then-insert) ketika item sudah ada.
	details := item.Details
	item.Details = nil

	return config.DB.Transaction(func(tx *gorm.DB) error {
		if item.ID == 0 {
			if err := tx.Create(item).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Save(item).Error; err != nil {
				return err
			}
			if err := tx.Where("mapping_transaksi_id = ?", item.ID).Delete(&models.MappingTransaksiDetail{}).Error; err != nil {
				return err
			}
		}
		if len(details) == 0 {
			return nil
		}
		for i := range details {
			details[i].ID = 0
			details[i].MappingTransaksiID = item.ID
			if details[i].Urutan == 0 {
				details[i].Urutan = i + 1
			}
		}
		if err := tx.Create(&details).Error; err != nil {
			return err
		}
		item.Details = details
		return nil
	})
}

func DeleteAllMappingTransaksi(profileID *uint, jenisMapping string) error {
	query := config.DB
	if profileID != nil {
		query = query.Where("profile_bum_des_id = ?", *profileID)
	}
	if jenisMapping != "" {
		query = query.Where("jenis_mapping = ?", jenisMapping)
	}
	return query.Delete(&models.MappingTransaksi{}).Error
}

func DeleteMappingTransaksiBySlug(slug string, profileID *uint, jenisMapping string) error {
	query := config.DB.Where("slug = ?", slug)
	if profileID != nil {
		query = query.Where("profile_bum_des_id = ?", *profileID)
	}
	if jenisMapping != "" {
		query = query.Where("jenis_mapping = ?", jenisMapping)
	}
	res := query.Delete(&models.MappingTransaksi{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
