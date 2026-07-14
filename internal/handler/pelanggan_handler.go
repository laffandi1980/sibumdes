package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func parsePelangganBool(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	return normalized == "1" || normalized == "true" || normalized == "on" || normalized == "yes" || normalized == "ya"
}

func parsePelangganCurrency(value string) int64 {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0
	}

	var digits strings.Builder
	for _, r := range trimmed {
		if unicode.IsDigit(r) {
			digits.WriteRune(r)
		}
	}

	if digits.Len() == 0 {
		return 0
	}

	parsed, err := strconv.ParseInt(digits.String(), 10, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func GetPelanggans(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	sessionSlug := r.URL.Query().Get("session_slug")
	var reqProfileID *uint
	if sessionSlug != "" {
		loggedUser, err := service.GetUserBySlug(sessionSlug)
		if err == nil && loggedUser != nil && loggedUser.ProfileBUMDesID != nil && *loggedUser.ProfileBUMDesID != 0 {
			reqProfileID = loggedUser.ProfileBUMDesID
		}
	}

	data, err := service.GetAllPelanggan(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching pelanggan", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func GetPelanggan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	obj, err := service.GetPelangganBySlug(slug)
	if err != nil {
		http.Error(w, "Error fetching pelanggan", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj)
}

func SavePelanggan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	slug := r.FormValue("slug")
	var existing *models.Pelanggan

	if slug != "" {
		p, err := service.GetPelangganBySlug(slug)
		if err == nil && p.ID > 0 {
			existing = p
		}
	}

	if existing == nil {
		existing = &models.Pelanggan{}
	}

	unitIDStr := r.FormValue("unit_usaha_id")
	var unitIDPtr *uint
	if unitIDStr != "" {
		if u, err := strconv.ParseUint(unitIDStr, 10, 32); err == nil {
			val := uint(u)
			unitIDPtr = &val
		}
	}

	existing.UnitUsahaID = unitIDPtr

	profileBumdesIDStr := r.FormValue("profile_bumdes_id")
	if profileBumdesIDStr != "" {
		if pid, err := strconv.ParseUint(profileBumdesIDStr, 10, 32); err == nil {
			val := uint(pid)
			existing.ProfileBUMDesID = &val
		} else {
			existing.ProfileBUMDesID = nil
		}
	} else {
		existing.ProfileBUMDesID = nil
	}
	existing.KodePelanggan = strings.TrimSpace(r.FormValue("kode_pelanggan"))
	existing.NamaPelanggan = strings.TrimSpace(r.FormValue("nama_pelanggan"))
	existing.Alamat = strings.TrimSpace(r.FormValue("alamat"))
	existing.NoTelepon = strings.TrimSpace(r.FormValue("no_telepon"))
	existing.Status = strings.TrimSpace(r.FormValue("status"))
	existing.SaldoAwal = parsePelangganCurrency(r.FormValue("saldo_awal"))
	existing.BkPembantuPiutang = parsePelangganBool(r.FormValue("bk_pembantu_piutang"))
	existing.LinkAkun = strings.TrimSpace(r.FormValue("link_akun"))

	err = service.SavePelanggan(existing)
	if err != nil {
		http.Error(w, "Error saving pelanggan: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Pelanggan saved successfully"))
}

func DeletePelanggan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	err := service.DeletePelangganBySlug(slug)
	if err != nil {
		http.Error(w, "Error deleting pelanggan", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Pelanggan deleted successfully"))
}

func ImportPelanggan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	sessionSlug := r.URL.Query().Get("session_slug")
	var reqProfileID *uint
	if sessionSlug != "" {
		loggedUser, err := service.GetUserBySlug(sessionSlug)
		if err == nil && loggedUser != nil {
			reqProfileID = loggedUser.ProfileBUMDesID
		}
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.LazyQuotes = true
	reader.FieldsPerRecord = -1

	// Try reading with comma
	records, err := reader.ReadAll()

	// If it successfully read but the first row only has 1 column, it's very likely semicolon delimited
	if err == nil && len(records) > 0 && len(records[0]) == 1 && strings.Contains(records[0][0], ";") {
		err = fmt.Errorf("wrong delimiter") // force fallback
	}

	if err != nil {
		// Fallback to semicolon
		file.Seek(0, 0)
		reader = csv.NewReader(file)
		reader.Comma = ';'
		reader.LazyQuotes = true
		reader.FieldsPerRecord = -1

		records, err = reader.ReadAll()
		if err != nil {
			http.Error(w, "Error reading CSV Format: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	successCount := 0
	var lastErr error

	for i, record := range records {
		if i == 0 {
			continue
		} // Skip header row
		if len(record) < 5 {
			continue
		} // Expect at least 5 cols (Kode, Nama, Tlp, Alamat, UnitID)

		kode := strings.TrimSpace(record[0])
		nama := strings.TrimSpace(record[1])
		tlp := strings.TrimSpace(record[2])
		alamat := strings.TrimSpace(record[3])
		unitStr := strings.TrimSpace(record[4])
		status := "Aktif"
		if len(record) > 5 && strings.TrimSpace(record[5]) != "" {
			status = strings.TrimSpace(record[5])
		}
		saldoAwal := int64(0)
		if len(record) > 6 {
			saldoAwal = parsePelangganCurrency(record[6])
		}
		bkPembantuPiutang := false
		if len(record) > 7 {
			bkPembantuPiutang = parsePelangganBool(record[7])
		}
		linkAkun := "1-1310 Piutang Usaha"
		if len(record) > 8 && strings.TrimSpace(record[8]) != "" {
			linkAkun = strings.TrimSpace(record[8])
		}

		if strings.HasPrefix(tlp, "=\"") && strings.HasSuffix(tlp, "\"") {
			tlp = strings.TrimSuffix(strings.TrimPrefix(tlp, "=\""), "\"")
		} else if strings.HasPrefix(tlp, "'") {
			tlp = strings.TrimPrefix(tlp, "'")
		}

		if nama == "" || tlp == "" || unitStr == "" {
			continue
		}

		var unitIDPtr *uint
		if u, err := strconv.ParseUint(unitStr, 10, 32); err == nil {
			val := uint(u)
			unitIDPtr = &val
		} else {
			continue // skip row if unit ID is invalid
		}

		obj := models.Pelanggan{
			KodePelanggan:     kode,
			UnitUsahaID:       unitIDPtr,
			NamaPelanggan:     nama,
			Alamat:            alamat,
			NoTelepon:         tlp,
			Status:            status,
			SaldoAwal:         saldoAwal,
			BkPembantuPiutang: bkPembantuPiutang,
			LinkAkun:          linkAkun,
		}

		// If reqProfileID is empty (Pengembang), we should deduce the ProfileBUMDesID from the UnitUsaha!
		if reqProfileID != nil {
			obj.ProfileBUMDesID = reqProfileID
		} else {
			var unit models.UnitUsaha
			if config.DB.First(&unit, *unitIDPtr).Error == nil {
				if unit.ProfileID != 0 {
					obj.ProfileBUMDesID = &unit.ProfileID
				}
			}
		}

		if err := service.SavePelanggan(&obj); err == nil {
			successCount++
		} else {
			lastErr = err
		}
	}

	if successCount == 0 && lastErr != nil {
		http.Error(w, "Semua data gagal disimpan. Error: "+lastErr.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(strconv.Itoa(successCount) + " baris data berhasil ditambahkan ke database"))
}
