package service

import (
	"errors"
	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"strings"
)

type PelangganContactInput struct {
	Alamat      string
	NoTelepon   string
	PartnerType string
}

// SaveTransactions performs a bulk insert/update of transactions
func SaveTransactions(transactions []models.Transaksi) error {
	if len(transactions) == 0 {
		return errors.New("no transactions to save")
	}

	result := config.DB.Create(&transactions)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// GetTransactionsByProfile retrieves all transactions for a specific BUMDes profile
func GetTransactionsByProfile(profileID *uint) ([]models.Transaksi, error) {
	var results []models.Transaksi
	query := config.DB.Preload("UnitUsaha").Preload("ProfileBUMDes").Order("id asc")
	if profileID != nil {
		query = query.Where("profile_bum_des_id = ?", *profileID)
	}
	if err := query.Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

// EnsurePartnersFromTransactions auto-creates pelanggan or supplier records based on PartnerType.
// Returns (addedPelanggan, addedSupplier, error).
func EnsurePartnersFromTransactions(transactions []models.Transaksi, contactMap map[string]PelangganContactInput) (int, int, error) {
	pelangganMap := map[string]PelangganContactInput{}
	supplierMap := map[string]PelangganContactInput{}

	for k, v := range contactMap {
		if strings.EqualFold(strings.TrimSpace(v.PartnerType), "supplier") {
			supplierMap[k] = v
		} else {
			pelangganMap[k] = v
		}
	}

	// Filter transactions by partner type
	var pelangganTx, supplierTx []models.Transaksi
	for _, tx := range transactions {
		key := strings.ToLower(strings.TrimSpace(tx.NamaPelangganPemasok))
		if _, ok := supplierMap[key]; ok {
			supplierTx = append(supplierTx, tx)
		} else {
			pelangganTx = append(pelangganTx, tx)
		}
	}

	addedPelanggan, err := EnsurePelangganFromTransactions(pelangganTx, pelangganMap)
	if err != nil {
		return addedPelanggan, 0, err
	}

	addedSupplier, err := EnsureSupplierFromTransactions(supplierTx, supplierMap)
	if err != nil {
		return addedPelanggan, addedSupplier, err
	}

	return addedPelanggan, addedSupplier, nil
}

// EnsureSupplierFromTransactions auto-creates supplier records from transaksi names.
func EnsureSupplierFromTransactions(transactions []models.Transaksi, contactMap map[string]PelangganContactInput) (int, error) {
	added := 0
	processed := map[string]bool{}

	for _, tx := range transactions {
		nama := strings.TrimSpace(tx.NamaPelangganPemasok)
		if nama == "" {
			continue
		}

		key := strings.ToLower(nama)
		if processed[key] {
			continue
		}
		processed[key] = true

		var count int64
		query := config.DB.Model(&models.Supplier{}).
			Where("LOWER(TRIM(nama_supplier)) = LOWER(TRIM(?))", nama)
		if tx.ProfileBUMDesID != 0 {
			query = query.Where("profile_bum_des_id = ?", tx.ProfileBUMDesID)
		}
		if tx.UnitUsahaID != 0 {
			query = query.Where("unit_usaha_id = ?", tx.UnitUsahaID)
		}
		err := query.Count(&count).Error
		if err != nil {
			return added, err
		}

		if count > 0 {
			continue
		}

		profileID := tx.ProfileBUMDesID
		unitID := tx.UnitUsahaID
		contact := PelangganContactInput{}
		if contactMap != nil {
			contact = contactMap[key]
		}
		alamat := strings.TrimSpace(contact.Alamat)
		if alamat == "" {
			alamat = "-"
		}
		noTelepon := strings.TrimSpace(contact.NoTelepon)
		if noTelepon == "" {
			noTelepon = "-"
		}

		s := models.Supplier{
			NamaSupplier:    nama,
			Alamat:          alamat,
			NoTelepon:       noTelepon,
			ProfileBUMDesID: &profileID,
			UnitUsahaID:     &unitID,
		}

		if err := SaveSupplier(&s); err != nil {
			return added, err
		}

		added++
	}

	return added, nil
}

// EnsurePelangganFromTransactions auto-creates pelanggan records from transaksi names
// when the name does not yet exist in tabel pelanggan.
func EnsurePelangganFromTransactions(transactions []models.Transaksi, contactMap map[string]PelangganContactInput) (int, error) {
	added := 0
	processed := map[string]bool{}

	for _, tx := range transactions {
		nama := strings.TrimSpace(tx.NamaPelangganPemasok)
		if nama == "" {
			continue
		}

		key := strings.ToLower(nama)
		if processed[key] {
			continue
		}
		processed[key] = true

		var count int64
		query := config.DB.Model(&models.Pelanggan{}).
			Where("LOWER(TRIM(nama_pelanggan)) = LOWER(TRIM(?))", nama)
		if tx.ProfileBUMDesID != 0 {
			query = query.Where("profile_bum_des_id = ?", tx.ProfileBUMDesID)
		}
		if tx.UnitUsahaID != 0 {
			query = query.Where("unit_usaha_id = ?", tx.UnitUsahaID)
		}
		err := query.Count(&count).Error
		if err != nil {
			return added, err
		}

		if count > 0 {
			continue
		}

		profileID := tx.ProfileBUMDesID
		unitID := tx.UnitUsahaID
		contact := PelangganContactInput{}
		if contactMap != nil {
			contact = contactMap[key]
		}
		alamat := strings.TrimSpace(contact.Alamat)
		if alamat == "" {
			alamat = "-"
		}
		noTelepon := strings.TrimSpace(contact.NoTelepon)
		if noTelepon == "" {
			noTelepon = "-"
		}

		p := models.Pelanggan{
			NamaPelanggan:   nama,
			Alamat:          alamat,
			NoTelepon:       noTelepon,
			ProfileBUMDesID: &profileID,
			UnitUsahaID:     &unitID,
		}

		if err := SavePelanggan(&p); err != nil {
			return added, err
		}

		added++
	}

	return added, nil
}
