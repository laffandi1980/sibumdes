package service

import (
	"errors"
	"fmt"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
	"strings"

	"github.com/google/uuid"
)

func GetAllPelanggan(requesterProfileID *uint) ([]models.Pelanggan, error) {
	return repository.GetAllPelanggan(requesterProfileID)
}

func GetPelangganByID(id uint) (*models.Pelanggan, error) {
	return repository.GetPelangganByID(id)
}

func GetPelangganBySlug(slug string) (*models.Pelanggan, error) {
	return repository.GetPelangganBySlug(slug)
}

func SavePelanggan(p *models.Pelanggan) error {
	if p.NamaPelanggan == "" {
		return errors.New("nama pelanggan cannot be empty")
	}
	if p.NoTelepon == "" {
		return errors.New("nomor telepon cannot be empty")
	}

	if p.UnitUsahaID == nil {
		return errors.New("unit usaha is required")
	}

	if strings.TrimSpace(p.Status) == "" {
		p.Status = "Aktif"
	}
	if strings.TrimSpace(p.LinkAkun) == "" {
		p.LinkAkun = "-"
	}

	if p.Slug == "" {
		p.Slug = uuid.New().String()
	}

	// Generate KodePelanggan per Unit Usaha: PLG-[00ID][Sequence]
	if p.ID == 0 && p.KodePelanggan == "" {
		unitID := *p.UnitUsahaID
		lastData, err := repository.GetLastPelangganByUnit(unitID)

		if err != nil || lastData.ID == 0 {
			p.KodePelanggan = fmt.Sprintf("PLG-%03d1", unitID)
		} else {
			// Extract count from e.g. PLG-0023
			var prefix string
			n, _ := fmt.Sscanf(lastData.KodePelanggan, "PLG-%s", &prefix)
			if n > 0 {
				// Strip the unitID prefix assuming it's correctly formatted, or just simply extract trailing numbers
				// A simpler approach: pull all trailing digits and increment
				extractedCount := extractTrailingSequence(lastData.KodePelanggan)
				if extractedCount > 0 {
					p.KodePelanggan = fmt.Sprintf("PLG-%03d%d", unitID, extractedCount+1)
				} else {
					p.KodePelanggan = fmt.Sprintf("PLG-%03d%d", unitID, lastData.ID+1)
				}
			} else {
				p.KodePelanggan = fmt.Sprintf("PLG-%03d%d", unitID, lastData.ID+1)
			}
		}
	}

	return repository.SavePelanggan(p)
}

func UpdateAllPelangganLinkAkun(linkAkun string) error {
	normalized := strings.TrimSpace(linkAkun)
	if normalized == "" {
		normalized = "-"
	}
	return repository.UpdateAllPelangganLinkAkun(normalized)
}

func extractTrailingSequence(code string) int {
	// E.g. PLG-00213 where unitID is 2, sequence is 13.
	// Since length of unit part is fixed? No, unitID could be anything.
	// We'll trust the fmt pattern used: PLG-%03d%d
	// So we find the integer from the last part avoiding the 002 prefix.
	// Wait, PLG-0021 consists of 'PLG-002' and '1'.
	parts := strings.Split(code, "-")
	if len(parts) < 2 {
		return 0
	}
	numStr := parts[1]
	// assume prefix is 3 chars: %03d -> e.g. "002"
	if len(numStr) > 3 {
		seqStr := numStr[3:]
		var count int
		fmt.Sscanf(seqStr, "%d", &count)
		return count
	}
	return 0
}

func DeletePelangganBySlug(slug string) error {
	return repository.DeletePelangganBySlug(slug)
}
