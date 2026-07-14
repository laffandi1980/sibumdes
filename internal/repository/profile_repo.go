package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"

	"gorm.io/gorm"
)

// GetAllProfiles returns all profiles
func GetAllProfiles(requesterProfileID *uint) ([]models.ProfileBUMDes, error) {
	if config.DB == nil {
		return nil, nil
	}
	var profiles []models.ProfileBUMDes
	query := config.DB.Preload("UnitUsaha")
	if requesterProfileID != nil {
		query = query.Where("id = ?", *requesterProfileID)
	}
	err := query.Find(&profiles).Error
	if err != nil {
		return nil, err
	}
	return profiles, nil
}

// GetProfileByID returns a single profile by ID
func GetProfileByID(id uint, requesterProfileID *uint) (*models.ProfileBUMDes, error) {
	if config.DB == nil {
		return nil, nil
	}
	var profile models.ProfileBUMDes
	query := config.DB.Preload("UnitUsaha").Where("id = ?", id)
	if requesterProfileID != nil {
		query = query.Where("id = ?", *requesterProfileID)
	}
	err := query.First(&profile).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// GetProfileBySlug returns a single profile by Slug
func GetProfileBySlug(slug string, requesterProfileID *uint) (*models.ProfileBUMDes, error) {
	if config.DB == nil {
		return nil, nil
	}
	var profile models.ProfileBUMDes
	query := config.DB.Preload("UnitUsaha").Where("slug = ?", slug)
	if requesterProfileID != nil {
		query = query.Where("id = ?", *requesterProfileID)
	}
	err := query.First(&profile).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// DeleteProfile deletes a profile and its related units
func DeleteProfile(id uint, requesterProfileID *uint) error {
	if config.DB == nil {
		return nil
	}
	if requesterProfileID != nil && id != *requesterProfileID {
		return gorm.ErrRecordNotFound
	}
	// Delete related unit usaha first
	config.DB.Where("profile_id = ?", id).Delete(&models.UnitUsaha{})
	// Delete profile
	return config.DB.Delete(&models.ProfileBUMDes{}, id).Error
}

// DeleteUnitUsaha deletes a single unit usaha by ID.
func DeleteUnitUsaha(id uint) error {
	if config.DB == nil {
		return nil
	}
	return config.DB.Delete(&models.UnitUsaha{}, id).Error
}

func SaveProfile(profile *models.ProfileBUMDes) error {
	if config.DB == nil {
		return nil // Avoid panic if database is offline
	}

	if profile.ID != 0 {
		return config.DB.Transaction(func(tx *gorm.DB) error {
			var existing models.ProfileBUMDes
			if err := tx.First(&existing, profile.ID).Error; err != nil {
				return err
			}

			updates := map[string]interface{}{
				"nama_bum_des":            profile.NamaBUMDes,
				"slug":                    profile.Slug,
				"alamat_lengkap":          profile.AlamatLengkap,
				"nomor_telepon":           profile.NomorTelepon,
				"nomor_izin_usaha":        profile.NomorIzinUsaha,
				"logo_path":               profile.LogoPath,
				"visi":                    profile.Visi,
				"misi":                    profile.Misi,
				"nama_ketua_bum_des":      profile.NamaKetuaBUMDes,
				"sekretaris_bum_des":      profile.SekretarisBUMDes,
				"bendahara_bum_des":       profile.BendaharaBUMDes,
				"pendamping_bum_des":      profile.PendampingBUMDes,
				"pengawas_bum_des":        profile.PengawasBUMDes,
				"tanggal_awal_pembukuan":  profile.TanggalAwalPembukuan,
				"tanggal_akhir_pembukuan": profile.TanggalAkhirPembukuan,
			}

			if err := tx.Model(&models.ProfileBUMDes{}).Where("id = ?", profile.ID).Updates(updates).Error; err != nil {
				return err
			}

			for _, unit := range profile.UnitUsaha {
				if unit.ID > 0 {
					unitUpdates := map[string]interface{}{
						"nama_unit_usaha":  unit.NamaUnitUsaha,
						"bidang_usaha":     unit.BidangUsaha,
						"penanggung_jawab": unit.PenanggungJawab,
						"mata_uang":        unit.MataUang,
						"tanggal_daftar":   unit.TanggalDaftar,
						"status":           unit.Status,
					}
					if err := tx.Model(&models.UnitUsaha{}).
						Where("id = ? AND profile_id = ?", unit.ID, profile.ID).
						Updates(unitUpdates).Error; err != nil {
						return err
					}
					continue
				}

				unit.ProfileID = profile.ID
				if err := tx.Create(&unit).Error; err != nil {
					return err
				}
			}

			return nil
		})
	}

	// Create new
	return config.DB.Create(profile).Error
}
