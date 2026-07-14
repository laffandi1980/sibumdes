package service

import (
	"errors"
	"fmt"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
	"strings"

	"github.com/google/uuid"
)

func GetAllSupplier(requesterProfileID *uint) ([]models.Supplier, error) {
	return repository.GetAllSupplier(requesterProfileID)
}

func GetSupplierByID(id uint) (*models.Supplier, error) {
	return repository.GetSupplierByID(id)
}

func GetSupplierBySlug(slug string) (*models.Supplier, error) {
	return repository.GetSupplierBySlug(slug)
}

func SaveSupplier(s *models.Supplier) error {
	if s.NamaSupplier == "" {
		return errors.New("nama supplier cannot be empty")
	}
	if s.NoTelepon == "" {
		return errors.New("nomor telepon cannot be empty")
	}

	if s.UnitUsahaID == nil {
		return errors.New("unit usaha is required")
	}

	if strings.TrimSpace(s.Status) == "" {
		s.Status = "Aktif"
	}
	if strings.TrimSpace(s.LinkAkun) == "" {
		s.LinkAkun = "2-0100 Utang Usaha"
	}

	if s.Slug == "" {
		s.Slug = uuid.New().String()
	}

	// Generate KodeSupplier per Unit Usaha: SUP-[00ID][Sequence]
	if s.ID == 0 && s.KodeSupplier == "" {
		unitID := *s.UnitUsahaID
		lastData, err := repository.GetLastSupplierByUnit(unitID)

		if err != nil || lastData.ID == 0 {
			s.KodeSupplier = fmt.Sprintf("SUP-%03d1", unitID)
		} else {
			extractedCount := extractTrailingSequence(lastData.KodeSupplier)
			if extractedCount > 0 {
				s.KodeSupplier = fmt.Sprintf("SUP-%03d%d", unitID, extractedCount+1)
			} else {
				s.KodeSupplier = fmt.Sprintf("SUP-%03d%d", unitID, lastData.ID+1)
			}
		}
	}

	return repository.SaveSupplier(s)
}

func DeleteSupplierBySlug(slug string) error {
	return repository.DeleteSupplierBySlug(slug)
}
