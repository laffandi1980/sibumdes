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

func GetBarangs(w http.ResponseWriter, r *http.Request) {
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

	data, err := service.GetAllBarang(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching barang", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func GetBarang(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	obj, err := service.GetBarangBySlug(slug)
	if err != nil {
		http.Error(w, "Error fetching barang", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj)
}

func SaveBarang(w http.ResponseWriter, r *http.Request) {
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
	var existing *models.Barang

	if slug != "" {
		b, err := service.GetBarangBySlug(slug)
		if err == nil && b.ID > 0 {
			existing = b
		}
	}

	if existing == nil {
		existing = &models.Barang{}
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

	existing.KodeBarang = strings.TrimSpace(r.FormValue("kode_barang"))
	existing.NamaBarang = strings.TrimSpace(r.FormValue("nama_barang"))
	existing.MerkBarang = strings.TrimSpace(r.FormValue("merk_barang"))
	existing.Satuan = strings.TrimSpace(r.FormValue("satuan"))
	existing.Status = strings.TrimSpace(r.FormValue("status"))
	existing.SaldoAwalNominal = parsePelangganCurrency(r.FormValue("saldo_awal_nominal"))
	existing.KartuPersediaan = parsePelangganBool(r.FormValue("kartu_persediaan"))
	existing.LinkAkun = strings.TrimSpace(r.FormValue("link_akun"))

	if saldoQtyStr := strings.TrimSpace(r.FormValue("saldo_awal_qty")); saldoQtyStr != "" {
		saldoQtyStr = strings.ReplaceAll(saldoQtyStr, ",", ".")
		if saldoQty, err := strconv.ParseFloat(saldoQtyStr, 64); err == nil {
			existing.SaldoAwalQty = saldoQty
		}
	} else {
		existing.SaldoAwalQty = 0
	}

	// Parse float values
	if hbaStr := r.FormValue("harga_beli_awal"); hbaStr != "" {
		if hba, err := strconv.ParseFloat(hbaStr, 64); err == nil {
			existing.HargaBeliAwal = hba
		}
	}
	if hjStr := r.FormValue("harga_jual"); hjStr != "" {
		if hj, err := strconv.ParseFloat(hjStr, 64); err == nil {
			existing.HargaJual = hj
		}
	}

	err = service.SaveBarang(existing)
	if err != nil {
		http.Error(w, "Error saving barang: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Barang saved successfully"))
}

func DeleteBarang(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	err := service.DeleteBarangBySlug(slug)
	if err != nil {
		http.Error(w, "Error deleting barang", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Barang deleted successfully"))
}

func ImportBarang(w http.ResponseWriter, r *http.Request) {
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
		if len(record) < 6 {
			continue
		} // Expect at least 6 cols

		kode := strings.TrimSpace(record[0])
		nama := strings.TrimSpace(record[1])
		merk := strings.TrimSpace(record[2])
		hbaStr := strings.TrimSpace(record[3])
		hjStr := strings.TrimSpace(record[4])
		satuan := strings.TrimSpace(record[5])
		saldoQtyStr := ""
		if len(record) > 6 {
			saldoQtyStr = strings.TrimSpace(record[6])
		}
		saldoNominalStr := ""
		if len(record) > 7 {
			saldoNominalStr = strings.TrimSpace(record[7])
		}
		status := "Aktif"
		if len(record) > 8 && strings.TrimSpace(record[8]) != "" {
			status = strings.TrimSpace(record[8])
		}
		kartuPersediaan := false
		if len(record) > 9 {
			kartuPersediaan = parsePelangganBool(record[9])
		}
		linkAkun := "1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi"
		if len(record) > 10 && strings.TrimSpace(record[10]) != "" {
			linkAkun = strings.TrimSpace(record[10])
		}

		var unitStr string
		if len(record) > 11 {
			unitStr = strings.TrimSpace(record[11])
		}

		if nama == "" || merk == "" || satuan == "" || unitStr == "" {
			continue
		}

		hba, err := strconv.ParseFloat(hbaStr, 64)
		if err != nil || hba == 0 {
			continue
		}

		hj, err := strconv.ParseFloat(hjStr, 64)
		if err != nil || hj == 0 {
			continue
		}

		saldoQty := 0.0
		if saldoQtyStr != "" {
			saldoQtyStr = strings.ReplaceAll(saldoQtyStr, ",", ".")
			if parsedSaldoQty, err := strconv.ParseFloat(saldoQtyStr, 64); err == nil {
				saldoQty = parsedSaldoQty
			}
		}
		saldoNominal := parsePelangganCurrency(saldoNominalStr)

		var unitIDPtr *uint
		if u, err := strconv.ParseUint(unitStr, 10, 32); err == nil {
			val := uint(u)
			unitIDPtr = &val
		} else {
			continue
		}

		obj := models.Barang{
			KodeBarang:       kode,
			UnitUsahaID:      unitIDPtr,
			NamaBarang:       nama,
			MerkBarang:       merk,
			HargaBeliAwal:    hba,
			HargaJual:        hj,
			Satuan:           satuan,
			SaldoAwalQty:     saldoQty,
			SaldoAwalNominal: saldoNominal,
			Status:           status,
			KartuPersediaan:  kartuPersediaan,
			LinkAkun:         linkAkun,
		}

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

		if err := service.SaveBarang(&obj); err == nil {
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
	w.Write([]byte(fmt.Sprintf("Berhasil mengimpor %d data barang", successCount)))
}
