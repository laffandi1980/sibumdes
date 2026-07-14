package service

import (
	"errors"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"

	"github.com/google/uuid"
)

func GetAllMappingTransaksi(profileID *uint, jenisMapping string) ([]models.MappingTransaksi, error) {
	return repository.GetAllMappingTransaksi(profileID, jenisMapping)
}

func GetMappingTransaksiBySlug(slug string, profileID *uint, jenisMapping string) (*models.MappingTransaksi, error) {
	return repository.GetMappingTransaksiBySlug(slug, profileID, jenisMapping)
}

func SaveMappingTransaksi(item *models.MappingTransaksi) error {
	if item.NamaMapping == "" {
		return errors.New("nama mapping tidak boleh kosong")
	}
	if item.KlasifikasiArusKas == "" {
		return errors.New("klasifikasi arus kas tidak boleh kosong")
	}
	if item.CashInOut == "" {
		return errors.New("cash in/out tidak boleh kosong")
	}
	if item.KategoriArusKas == "" {
		return errors.New("kategori arus kas tidak boleh kosong")
	}
	if item.TipeDefault == "" {
		item.TipeDefault = "semua"
	}
	if item.TipeDefault != "tunai" && item.TipeDefault != "kredit" && item.TipeDefault != "semua" {
		item.TipeDefault = "semua"
	}
	if item.KategoriTransaksi == "" {
		if item.CashInOut == "kas_keluar" {
			item.KategoriTransaksi = "keluar"
		} else {
			item.KategoriTransaksi = "masuk"
		}
	}
	if item.JenisMapping == "" {
		item.JenisMapping = "harian"
	}
	if item.Slug == "" {
		item.Slug = uuid.New().String()
	}
	return repository.SaveMappingTransaksi(item)
}

func DeleteAllMappingTransaksi(profileID *uint, jenisMapping string) error {
	return repository.DeleteAllMappingTransaksi(profileID, jenisMapping)
}

func DeleteMappingTransaksiBySlug(slug string, profileID *uint, jenisMapping string) error {
	return repository.DeleteMappingTransaksiBySlug(slug, profileID, jenisMapping)
}
