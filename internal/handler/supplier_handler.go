package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func GetSuppliers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
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

	data, err := service.GetAllSupplier(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching supplier", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func GetSupplier(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	obj, err := service.GetSupplierBySlug(slug)
	if err != nil {
		http.Error(w, "Error fetching supplier", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj)
}

func SaveSupplier(w http.ResponseWriter, r *http.Request) {
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
	var existing *models.Supplier

	if slug != "" {
		s, err := service.GetSupplierBySlug(slug)
		if err == nil && s.ID > 0 {
			existing = s
		}
	}

	if existing == nil {
		existing = &models.Supplier{}
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
	existing.KodeSupplier = strings.TrimSpace(r.FormValue("kode_supplier"))
	existing.NamaSupplier = strings.TrimSpace(r.FormValue("nama_supplier"))
	existing.BidangSupply = strings.TrimSpace(r.FormValue("bidang_supply"))
	existing.Alamat = strings.TrimSpace(r.FormValue("alamat"))
	existing.NoTelepon = strings.TrimSpace(r.FormValue("no_telepon"))
	existing.Status = strings.TrimSpace(r.FormValue("status"))
	existing.SaldoAwal = parsePelangganCurrency(r.FormValue("saldo_awal"))
	existing.BkPembantuUtang = parsePelangganBool(r.FormValue("bk_pembantu_utang"))
	existing.LinkAkun = strings.TrimSpace(r.FormValue("link_akun"))

	err = service.SaveSupplier(existing)
	if err != nil {
		http.Error(w, "Error saving supplier: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Supplier saved successfully"))
}

func DeleteSupplier(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	err := service.DeleteSupplierBySlug(slug)
	if err != nil {
		http.Error(w, "Error deleting supplier", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Supplier deleted successfully"))
}

func ImportSupplier(w http.ResponseWriter, r *http.Request) {
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
		bidangSupply := ""
		if len(record) > 5 {
			bidangSupply = strings.TrimSpace(record[5])
		}
		status := "Aktif"
		if len(record) > 6 && strings.TrimSpace(record[6]) != "" {
			status = strings.TrimSpace(record[6])
		}
		saldoAwal := int64(0)
		if len(record) > 7 {
			saldoAwal = parsePelangganCurrency(record[7])
		}
		bkPembantuUtang := false
		if len(record) > 8 {
			bkPembantuUtang = parsePelangganBool(record[8])
		}
		linkAkun := "2-0100 Utang Usaha"
		if len(record) > 9 && strings.TrimSpace(record[9]) != "" {
			linkAkun = strings.TrimSpace(record[9])
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

		obj := models.Supplier{
			KodeSupplier:    kode,
			UnitUsahaID:     unitIDPtr,
			NamaSupplier:    nama,
			BidangSupply:    bidangSupply,
			Alamat:          alamat,
			NoTelepon:       tlp,
			Status:          status,
			SaldoAwal:       saldoAwal,
			BkPembantuUtang: bkPembantuUtang,
			LinkAkun:        linkAkun,
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

		if err := service.SaveSupplier(&obj); err == nil {
			successCount++
		} else {
			lastErr = err
		}
	}

	if successCount == 0 {
		if lastErr != nil {
			http.Error(w, "Gagal mengimpor data: "+lastErr.Error(), http.StatusInternalServerError)
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Tidak ada data yang berhasil diimpor (format mungkin salah atau data kosong)"))
		}
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf("Berhasil mengimpor %d data supplier", successCount)))
}
