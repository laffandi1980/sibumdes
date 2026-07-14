package service

import (
	"errors"
	"fmt"
	"math"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
	"strings"
	"time"

	"github.com/google/uuid"
)

func GetAllInventaris(requesterProfileID *uint) ([]models.Inventaris, error) {
	return repository.GetAllInventaris(requesterProfileID)
}

func GetInventarisBySlug(slug string) (*models.Inventaris, error) {
	return repository.GetInventarisBySlug(slug)
}

func defaultInventarisAccounts(kategori string) (string, string) {
	switch strings.TrimSpace(strings.ToLower(kategori)) {
	case "bangunan":
		return "1-2020 Bangunan", "1-2091 Akumulasi Penyusutan Bangunan"
	case "kendaraan":
		return "1-2030 Kendaraan", "1-2092 Akumulasi Penyusutan Kendaraan"
	case "mesin", "peralatan", "inventaris kantor":
		return "1-2040 Peralatan dan Mesin", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin"
	case "tanah":
		return "1-2010 Tanah", "1-2090 Akumulasi Penyusutan Aset Tetap"
	default:
		return "1-2040 Peralatan dan Mesin", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin"
	}
}

func completedMonthDifference(startDate, endDate time.Time) int {
	if startDate.After(endDate) {
		return 0
	}

	months := (endDate.Year()-startDate.Year())*12 + int(endDate.Month()) - int(startDate.Month())
	if endDate.Day() < startDate.Day() {
		months--
	}
	if months < 0 {
		return 0
	}
	return months
}

func calculateInventarisAkumulasiPenyusutan(item *models.Inventaris) int64 {
	if item == nil || item.HargaBeli <= 0 || item.UmurEkonomis <= 0 || item.TanggalPembelian == nil {
		return item.AkumulasiPenyusutanAwal
	}

	referenceDate := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	purchaseDate := item.TanggalPembelian.UTC()
	monthDiff := completedMonthDifference(purchaseDate, referenceDate)
	depreciation := (item.HargaBeli / float64(item.UmurEkonomis)) * (float64(monthDiff) / 12)
	depreciation = math.Min(depreciation, item.HargaBeli)

	return int64(math.Round(depreciation))
}

func SaveInventaris(item *models.Inventaris) error {
	if strings.TrimSpace(item.NamaAset) == "" {
		return errors.New("nama aset cannot be empty")
	}

	if strings.TrimSpace(item.Status) == "" {
		item.Status = "Aktif"
	}

	defaultAsetTetap, defaultAkumulasi := defaultInventarisAccounts(item.KategoriAset)
	if strings.TrimSpace(item.LinkAkunAsetTetap) == "" {
		item.LinkAkunAsetTetap = defaultAsetTetap
	}
	if strings.TrimSpace(item.LinkAkunAkumulasiPenyusutan) == "" {
		item.LinkAkunAkumulasiPenyusutan = defaultAkumulasi
	}
	item.Aktif = strings.EqualFold(strings.TrimSpace(item.Status), "aktif")
	item.AkumulasiPenyusutanAwal = calculateInventarisAkumulasiPenyusutan(item)

	if item.Slug == "" {
		item.Slug = uuid.New().String()
	}

	if item.ID == 0 && item.KodeAset == "" {
		if item.UnitUsahaID == nil {
			return errors.New("unit usaha is required")
		}
		unitID := *item.UnitUsahaID
		last, err := repository.GetLastInventarisByUnit(unitID)
		if err != nil || last.ID == 0 {
			item.KodeAset = fmt.Sprintf("AT-%03d1", unitID)
		} else {
			extractedCount := extractTrailingSequence(last.KodeAset)
			if extractedCount > 0 {
				item.KodeAset = fmt.Sprintf("AT-%03d%d", unitID, extractedCount+1)
			} else {
				item.KodeAset = fmt.Sprintf("AT-%03d%d", unitID, last.ID+1)
			}
		}
	}

	return repository.SaveInventaris(item)
}

func DeleteInventarisBySlug(slug string) error {
	return repository.DeleteInventarisBySlug(slug)
}
