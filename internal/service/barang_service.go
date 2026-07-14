package service

import (
	"errors"
	"fmt"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
	"strings"

	"github.com/google/uuid"
)

func GetAllBarang(requesterProfileID *uint) ([]models.Barang, error) {
	return repository.GetAllBarang(requesterProfileID)
}

func GetBarangByID(id uint) (*models.Barang, error) {
	return repository.GetBarangByID(id)
}

func GetBarangBySlug(slug string) (*models.Barang, error) {
	return repository.GetBarangBySlug(slug)
}

func SaveBarang(b *models.Barang) error {
	if b.NamaBarang == "" {
		return errors.New("nama barang cannot be empty")
	}
	if b.MerkBarang == "" {
		return errors.New("merk barang cannot be empty")
	}
	if b.Satuan == "" {
		return errors.New("satuan cannot be empty")
	}
	if b.HargaBeliAwal == 0 {
		return errors.New("harga beli awal cannot be 0")
	}
	if b.HargaJual == 0 {
		return errors.New("harga jual cannot be 0")
	}
	if strings.TrimSpace(b.Status) == "" {
		b.Status = "Aktif"
	}
	if strings.TrimSpace(b.LinkAkun) == "" {
		b.LinkAkun = "1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi"
	}

	if b.Slug == "" {
		b.Slug = uuid.New().String()
	}

	// Generate KodeBarang per Unit Usaha: BRG-[00ID][Sequence]
	if b.ID == 0 && b.KodeBarang == "" {
		unitID := *b.UnitUsahaID
		lastData, err := repository.GetLastBarangByUnit(unitID)

		if err != nil || lastData.ID == 0 {
			b.KodeBarang = fmt.Sprintf("BRG-%03d1", unitID)
		} else {
			extractedCount := extractTrailingSequence(lastData.KodeBarang)
			if extractedCount > 0 {
				b.KodeBarang = fmt.Sprintf("BRG-%03d%d", unitID, extractedCount+1)
			} else {
				b.KodeBarang = fmt.Sprintf("BRG-%03d%d", unitID, lastData.ID+1)
			}
		}
	}

	return repository.SaveBarang(b)
}

func DeleteBarangBySlug(slug string) error {
	return repository.DeleteBarangBySlug(slug)
}
