package service

import (
	"errors"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
	"strings"

	"github.com/google/uuid"
)

func GetAllChartOfAccounts(requesterProfileID *uint, includeAllProfiles bool) ([]models.ChartOfAccount, error) {
	return repository.GetAllChartOfAccounts(requesterProfileID, includeAllProfiles)
}

func normalizeChartOfAccountSaldoNormal(kelompok, saldoNormal, namaAkun, catatan string) string {
	normalizedSaldo := strings.TrimSpace(strings.ToLower(saldoNormal))
	if normalizedSaldo == "kredit" {
		return "Kredit"
	}
	if normalizedSaldo == "debit" {
		return "Debit"
	}

	descriptor := strings.ToLower(strings.TrimSpace(namaAkun + " " + catatan))
	if strings.Contains(descriptor, "penyisihan") || strings.Contains(descriptor, "akumulasi") || strings.Contains(descriptor, "amortisasi") || strings.Contains(descriptor, "cadangan") {
		return "Kredit"
	}

	switch strings.TrimSpace(strings.ToLower(kelompok)) {
	case "kewajiban", "ekuitas", "pendapatan":
		return "Kredit"
	default:
		return "Debit"
	}
}

func ReplaceChartOfAccounts(requesterProfileID *uint, includeAllProfiles bool, entries []models.ChartOfAccount) error {
	validatedEntries := make([]models.ChartOfAccount, 0, len(entries))
	for index, entry := range entries {
		entry.Kelompok = strings.TrimSpace(entry.Kelompok)
		entry.StatusAkun = strings.TrimSpace(entry.StatusAkun)
		entry.KodeAkun = strings.TrimSpace(entry.KodeAkun)
		entry.KodeParent = strings.TrimSpace(entry.KodeParent)
		entry.NamaAkun = strings.TrimSpace(entry.NamaAkun)
		entry.Catatan = strings.TrimSpace(entry.Catatan)
		entry.SaldoNormal = normalizeChartOfAccountSaldoNormal(entry.Kelompok, entry.SaldoNormal, entry.NamaAkun, entry.Catatan)
		entry.ProfileBUMDesID = requesterProfileID
		entry.DisplayOrder = index + 1

		if entry.Slug == "" {
			entry.Slug = uuid.New().String()
		}

		if entry.Kelompok == "" {
			return errors.New("kelompok akun tidak boleh kosong")
		}
		if entry.StatusAkun != "Header" && entry.StatusAkun != "Detail" {
			return errors.New("status akun harus Header atau Detail")
		}
		if entry.LevelAkun < 1 || entry.LevelAkun > 5 {
			return errors.New("level akun harus di antara 1 sampai 5")
		}
		if entry.KodeAkun == "" {
			return errors.New("kode akun tidak boleh kosong")
		}
		if entry.NamaAkun == "" {
			return errors.New("nama akun tidak boleh kosong")
		}
		if entry.LevelAkun == 1 {
			entry.KodeParent = ""
		}
		if entry.LevelAkun > 1 && entry.KodeParent == "" {
			return errors.New("akun dengan level di atas 1 wajib memiliki akun parent")
		}

		validatedEntries = append(validatedEntries, entry)
	}

	return repository.ReplaceChartOfAccounts(requesterProfileID, includeAllProfiles, validatedEntries)
}

func DeleteAllChartOfAccounts(requesterProfileID *uint, includeAllProfiles bool) error {
	return repository.DeleteAllChartOfAccounts(requesterProfileID, includeAllProfiles)
}
