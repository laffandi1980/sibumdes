package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/service"

	"gorm.io/gorm"
)

type kartuPersediaanManualPayload struct {
	ID          uint    `json:"id"`
	SessionSlug string  `json:"session_slug"`
	UnitUsahaID uint    `json:"unit_usaha_id"`
	BarangSlug  string  `json:"barang_slug"`
	Tanggal     string  `json:"tanggal"`
	Jenis       string  `json:"jenis"`
	Deskripsi   string  `json:"deskripsi"`
	Qty         float64 `json:"qty"`
	Harga       float64 `json:"harga"`
	Keterangan  string  `json:"keterangan"`
}

type apiMessageResponse struct {
	Message string `json:"message"`
}

func writeAPIError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(apiMessageResponse{Message: message})
}

func writeAPIMessage(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(apiMessageResponse{Message: message})
}

func resolveProfileForManualKartu(sessionSlug string, unitUsahaID uint) (*uint, error) {
	if strings.TrimSpace(sessionSlug) != "" {
		loggedUser, err := service.GetUserBySlug(strings.TrimSpace(sessionSlug))
		if err == nil && loggedUser != nil && loggedUser.ProfileBUMDesID != nil {
			return loggedUser.ProfileBUMDesID, nil
		}
	}

	if unitUsahaID == 0 {
		return nil, errors.New("Unit usaha wajib diisi")
	}

	var unit models.UnitUsaha
	if err := config.DB.First(&unit, unitUsahaID).Error; err != nil {
		return nil, errors.New("Unit usaha tidak valid")
	}

	profileID := unit.ProfileID
	return &profileID, nil
}

func GetKartuPersediaanManual(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeAPIError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	sessionSlug := strings.TrimSpace(r.URL.Query().Get("session_slug"))
	unitUsahaRaw := strings.TrimSpace(r.URL.Query().Get("unit_usaha_id"))
	barangSlug := strings.TrimSpace(r.URL.Query().Get("barang_slug"))

	if unitUsahaRaw == "" || barangSlug == "" {
		writeAPIError(w, http.StatusBadRequest, "unit_usaha_id dan barang_slug wajib diisi")
		return
	}

	parsedUnitUsaha, err := strconv.ParseUint(unitUsahaRaw, 10, 32)
	if err != nil || parsedUnitUsaha == 0 {
		writeAPIError(w, http.StatusBadRequest, "unit_usaha_id tidak valid")
		return
	}
	unitUsahaID := uint(parsedUnitUsaha)

	profileID, err := resolveProfileForManualKartu(sessionSlug, unitUsahaID)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, err.Error())
		return
	}

	var rows []models.KartuPersediaanManual
	query := config.DB.Where("unit_usaha_id = ? AND barang_slug = ?", unitUsahaID, barangSlug)
	if profileID != nil {
		query = query.Where("profile_bum_des_id = ?", *profileID)
	}

	if err := query.Order("tanggal asc, id asc").Find(&rows).Error; err != nil {
		writeAPIError(w, http.StatusInternalServerError, "Gagal mengambil data manual kartu persediaan")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rows)
}

func SaveKartuPersediaanManual(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeAPIError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	var payload kartuPersediaanManualPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeAPIError(w, http.StatusBadRequest, "Format payload tidak valid")
		return
	}

	payload.BarangSlug = strings.TrimSpace(payload.BarangSlug)
	payload.Jenis = strings.ToLower(strings.TrimSpace(payload.Jenis))
	payload.Deskripsi = strings.TrimSpace(payload.Deskripsi)
	payload.Keterangan = strings.TrimSpace(payload.Keterangan)

	if payload.UnitUsahaID == 0 || payload.BarangSlug == "" {
		writeAPIError(w, http.StatusBadRequest, "unit_usaha_id dan barang_slug wajib diisi")
		return
	}
	if payload.Jenis != "masuk" && payload.Jenis != "keluar" {
		writeAPIError(w, http.StatusBadRequest, "jenis harus bernilai masuk atau keluar")
		return
	}
	if payload.Deskripsi == "" {
		writeAPIError(w, http.StatusBadRequest, "deskripsi wajib diisi")
		return
	}
	if payload.Qty <= 0 {
		writeAPIError(w, http.StatusBadRequest, "qty harus lebih besar dari 0")
		return
	}
	if payload.Harga < 0 {
		writeAPIError(w, http.StatusBadRequest, "harga harus bernilai 0 atau lebih")
		return
	}

	tanggal, err := time.Parse("2006-01-02", strings.TrimSpace(payload.Tanggal))
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "Format tanggal tidak valid, gunakan YYYY-MM-DD")
		return
	}

	profileID, err := resolveProfileForManualKartu(payload.SessionSlug, payload.UnitUsahaID)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, err.Error())
		return
	}

	if payload.ID == 0 {
		row := models.KartuPersediaanManual{
			ProfileBUMDesID: profileID,
			UnitUsahaID:     payload.UnitUsahaID,
			BarangSlug:      payload.BarangSlug,
			Tanggal:         tanggal,
			Jenis:           payload.Jenis,
			Deskripsi:       payload.Deskripsi,
			Qty:             payload.Qty,
			Harga:           payload.Harga,
			Keterangan:      payload.Keterangan,
		}
		if err := config.DB.Create(&row).Error; err != nil {
			writeAPIError(w, http.StatusInternalServerError, "Gagal menyimpan data manual kartu persediaan")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(row)
		return
	}

	var existing models.KartuPersediaanManual
	if err := config.DB.First(&existing, payload.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeAPIError(w, http.StatusNotFound, "Data tidak ditemukan")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, "Gagal mengambil data")
		return
	}

	if existing.UnitUsahaID != payload.UnitUsahaID || existing.BarangSlug != payload.BarangSlug {
		writeAPIError(w, http.StatusBadRequest, "Data unit usaha atau barang tidak sesuai")
		return
	}

	existing.ProfileBUMDesID = profileID
	existing.Tanggal = tanggal
	existing.Jenis = payload.Jenis
	existing.Deskripsi = payload.Deskripsi
	existing.Qty = payload.Qty
	existing.Harga = payload.Harga
	existing.Keterangan = payload.Keterangan

	if err := config.DB.Save(&existing).Error; err != nil {
		writeAPIError(w, http.StatusInternalServerError, "Gagal memperbarui data manual kartu persediaan")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existing)
}

func DeleteKartuPersediaanManual(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeAPIError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	idRaw := strings.TrimSpace(r.URL.Query().Get("id"))
	if idRaw == "" {
		writeAPIError(w, http.StatusBadRequest, "id wajib diisi")
		return
	}

	parsedID, err := strconv.ParseUint(idRaw, 10, 32)
	if err != nil || parsedID == 0 {
		writeAPIError(w, http.StatusBadRequest, "id tidak valid")
		return
	}

	if err := config.DB.Delete(&models.KartuPersediaanManual{}, uint(parsedID)).Error; err != nil {
		writeAPIError(w, http.StatusInternalServerError, "Gagal menghapus data manual kartu persediaan")
		return
	}
	writeAPIMessage(w, http.StatusOK, "Data manual kartu persediaan berhasil dihapus")
}
