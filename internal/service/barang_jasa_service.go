package service

import (
	"errors"
	"fmt"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
	"strings"

	"github.com/google/uuid"
)

func GetAllBarangJasa(requesterProfileID *uint) ([]models.BarangJasa, error) {
	return repository.GetAllBarangJasa(requesterProfileID)
}

func GetBarangJasaBySlug(slug string) (*models.BarangJasa, error) {
	return repository.GetBarangJasaBySlug(slug)
}

func SaveBarangJasa(bj *models.BarangJasa) error {
	if strings.TrimSpace(bj.NamaBarangJasa) == "" {
		return errors.New("nama barang/jasa cannot be empty")
	}
	if bj.UnitUsahaID == nil {
		return errors.New("unit usaha is required")
	}
	if strings.TrimSpace(bj.Jenis) == "" {
		return errors.New("jenis cannot be empty")
	}
	if strings.TrimSpace(bj.Satuan) == "" {
		return errors.New("satuan cannot be empty")
	}
	if bj.HargaJual <= 0 {
		return errors.New("harga jual must be greater than 0")
	}

	if bj.Slug == "" {
		bj.Slug = uuid.New().String()
	}

	if bj.ID == 0 && bj.KodeBarangJasa == "" {
		unitID := *bj.UnitUsahaID
		lastData, err := repository.GetLastBarangJasaByUnit(unitID)

		if err != nil || lastData.ID == 0 {
			bj.KodeBarangJasa = fmt.Sprintf("BJS-%03d1", unitID)
		} else {
			extractedCount := extractTrailingSequence(lastData.KodeBarangJasa)
			if extractedCount > 0 {
				bj.KodeBarangJasa = fmt.Sprintf("BJS-%03d%d", unitID, extractedCount+1)
			} else {
				bj.KodeBarangJasa = fmt.Sprintf("BJS-%03d%d", unitID, lastData.ID+1)
			}
		}
	}

	return repository.SaveBarangJasa(bj)
}

func DeleteBarangJasaBySlug(slug string) error {
	return repository.DeleteBarangJasaBySlug(slug)
}
