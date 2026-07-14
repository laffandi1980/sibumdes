package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"

	"gorm.io/gorm"
)

func applyChartOfAccountScope(query *gorm.DB, requesterProfileID *uint, includeAllProfiles bool) *gorm.DB {
	if includeAllProfiles {
		return query
	}
	if requesterProfileID != nil {
		return query.Where("profile_bum_des_id = ?", *requesterProfileID)
	}
	return query.Where("profile_bum_des_id IS NULL")
}

func GetAllChartOfAccounts(requesterProfileID *uint, includeAllProfiles bool) ([]models.ChartOfAccount, error) {
	var entries []models.ChartOfAccount
	query := config.DB.Preload("ProfileBUMDes")
	query = applyChartOfAccountScope(query, requesterProfileID, includeAllProfiles)
	err := query.Order("display_order asc, id asc").Find(&entries).Error
	return entries, err
}

func ReplaceChartOfAccounts(requesterProfileID *uint, includeAllProfiles bool, entries []models.ChartOfAccount) error {
	return config.DB.Transaction(func(tx *gorm.DB) error {
		deleteQuery := applyChartOfAccountScope(tx, requesterProfileID, includeAllProfiles)
		if err := deleteQuery.Delete(&models.ChartOfAccount{}).Error; err != nil {
			return err
		}

		if len(entries) == 0 {
			return nil
		}

		return tx.Create(&entries).Error
	})
}

func DeleteAllChartOfAccounts(requesterProfileID *uint, includeAllProfiles bool) error {
	query := applyChartOfAccountScope(config.DB, requesterProfileID, includeAllProfiles)
	return query.Delete(&models.ChartOfAccount{}).Error
}
