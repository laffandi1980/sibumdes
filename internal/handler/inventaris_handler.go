package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func GetInventariss(w http.ResponseWriter, r *http.Request) {
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

	data, err := service.GetAllInventaris(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching inventaris", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func GetInventaris(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}
	obj, err := service.GetInventarisBySlug(slug)
	if err != nil {
		http.Error(w, "Error fetching inventaris", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj)
}

func SaveInventaris(w http.ResponseWriter, r *http.Request) {
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
	var existing *models.Inventaris

	if slug != "" {
		b, err := service.GetInventarisBySlug(slug)
		if err == nil && b.ID > 0 {
			existing = b
		}
	}

	if existing == nil {
		existing = &models.Inventaris{}
	}

	// Profile
	sessionSlug := strings.TrimSpace(r.FormValue("session_slug"))
	if sessionSlug != "" {
		loggedUser, err := service.GetUserBySlug(sessionSlug)
		if err == nil && loggedUser != nil && loggedUser.ProfileBUMDesID != nil {
			existing.ProfileBUMDesID = loggedUser.ProfileBUMDesID
		}
	}
	if existing.ProfileBUMDesID == nil {
		if pidStr := r.FormValue("profile_bumdes_id"); pidStr != "" {
			if pid, err := strconv.ParseUint(pidStr, 10, 32); err == nil {
				val := uint(pid)
				existing.ProfileBUMDesID = &val
			}
		}
	}

	// Unit Usaha
	if uStr := r.FormValue("unit_usaha_id"); uStr != "" {
		if u, err := strconv.ParseUint(uStr, 10, 32); err == nil {
			val := uint(u)
			existing.UnitUsahaID = &val
		}
	}

	existing.NamaAset = strings.TrimSpace(r.FormValue("nama_aset"))
	existing.MerkAset = strings.TrimSpace(r.FormValue("merk_aset"))
	existing.KategoriAset = strings.TrimSpace(r.FormValue("kategori_aset"))
	existing.Satuan = strings.TrimSpace(r.FormValue("satuan"))
	existing.KodeAset = strings.TrimSpace(r.FormValue("kode_aset"))
	existing.NilaiResidu = parsePelangganCurrency(r.FormValue("nilai_residu"))
	existing.SaldoAwal = parsePelangganCurrency(r.FormValue("saldo_awal"))
	existing.LinkAkunAsetTetap = strings.TrimSpace(r.FormValue("link_akun_aset_tetap"))
	existing.AkumulasiPenyusutanAwal = parsePelangganCurrency(r.FormValue("akumulasi_penyusutan_awal"))
	existing.LinkAkunAkumulasiPenyusutan = strings.TrimSpace(r.FormValue("link_akun_akumulasi_penyusutan"))
	existing.Status = strings.TrimSpace(r.FormValue("status"))
	existing.KartuAsetTetap = parsePelangganBool(r.FormValue("kartu_aset_tetap"))

	existing.HargaBeli = float64(parsePelangganCurrency(r.FormValue("harga_beli")))
	if v := r.FormValue("ongkos_kirim"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			existing.OngkosKirim = f
		}
	}
	if v := r.FormValue("biaya_instalasi"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			existing.BiayaInstalasi = f
		}
	}
	if v := r.FormValue("umur_ekonomis"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			existing.UmurEkonomis = n
		}
	}

	if existing.Status == "" {
		existing.Status = "Aktif"
	}
	existing.Aktif = strings.EqualFold(existing.Status, "aktif")

	parseDate := func(s string) *time.Time {
		s = strings.TrimSpace(s)
		if s == "" {
			return nil
		}
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil
		}
		return &t
	}
	existing.TanggalPembelian = parseDate(r.FormValue("tanggal_pembelian"))
	existing.TanggalDigunakan = parseDate(r.FormValue("tanggal_digunakan"))
	existing.TanggalStatusTidakAktif = parseDate(r.FormValue("tanggal_status_tidak_aktif"))

	if err := service.SaveInventaris(existing); err != nil {
		http.Error(w, "Error saving inventaris: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Inventaris saved successfully"))
}

func DeleteInventaris(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}
	if err := service.DeleteInventarisBySlug(slug); err != nil {
		http.Error(w, "Error deleting inventaris", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Inventaris deleted successfully"))
}

func ImportInventaris(w http.ResponseWriter, r *http.Request) {
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

	// Try reading with comma first
	records, err := reader.ReadAll()
	if err == nil && len(records) > 0 && len(records[0]) == 1 && strings.Contains(records[0][0], ";") {
		err = fmt.Errorf("wrong delimiter")
	}

	if err != nil {
		file.Seek(0, 0)
		reader = csv.NewReader(file)
		reader.Comma = ';'
		reader.LazyQuotes = true
		reader.FieldsPerRecord = -1

		records, err = reader.ReadAll()
		if err != nil {
			http.Error(w, "Error reading CSV format: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	parseDate := func(v string) *time.Time {
		v = strings.TrimSpace(v)
		if v == "" {
			return nil
		}
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			return nil
		}
		return &t
	}

	successCount := 0
	var lastErr error

	for i, record := range records {
		if i == 0 {
			continue // Skip header
		}
		if len(record) < 15 {
			continue
		}

		kodeAset := strings.TrimSpace(record[0])
		namaAset := strings.TrimSpace(record[1])
		merkAset := strings.TrimSpace(record[2])
		kategoriAset := strings.TrimSpace(record[3])
		hargaBeliStr := strings.TrimSpace(record[4])
		tanggalPembelianStr := strings.TrimSpace(record[5])
		umurEkonomisStr := strings.TrimSpace(record[6])
		nilaiResiduStr := strings.TrimSpace(record[7])
		saldoAwalStr := strings.TrimSpace(record[8])
		linkAkunAsetTetap := strings.TrimSpace(record[9])
		akumulasiPenyusutanAwalStr := strings.TrimSpace(record[10])
		linkAkunAkumulasiPenyusutan := strings.TrimSpace(record[11])
		status := strings.TrimSpace(record[12])
		tanggalDigunakanStr := ""
		tanggalStatusTidakAktifStr := ""
		kartuAsetTetapStr := ""
		unitStr := ""
		if len(record) >= 17 {
			tanggalDigunakanStr = strings.TrimSpace(record[13])
			tanggalStatusTidakAktifStr = strings.TrimSpace(record[14])
			kartuAsetTetapStr = strings.TrimSpace(record[15])
			unitStr = strings.TrimSpace(record[16])
		} else {
			kartuAsetTetapStr = strings.TrimSpace(record[13])
			unitStr = strings.TrimSpace(record[14])
		}

		if namaAset == "" || unitStr == "" {
			continue
		}

		var unitIDPtr *uint
		if u, err := strconv.ParseUint(unitStr, 10, 32); err == nil {
			val := uint(u)
			unitIDPtr = &val
		} else {
			continue
		}

		hargaBeli := float64(parsePelangganCurrency(hargaBeliStr))
		umurEkonomis, _ := strconv.Atoi(umurEkonomisStr)
		nilaiResidu := parsePelangganCurrency(nilaiResiduStr)
		saldoAwal := parsePelangganCurrency(saldoAwalStr)
		akumulasiPenyusutanAwal := parsePelangganCurrency(akumulasiPenyusutanAwalStr)
		kartuAsetTetap := parsePelangganBool(kartuAsetTetapStr)
		if status == "" {
			status = "Aktif"
		}

		obj := models.Inventaris{
			KodeAset:                    kodeAset,
			UnitUsahaID:                 unitIDPtr,
			NamaAset:                    namaAset,
			MerkAset:                    merkAset,
			KategoriAset:                kategoriAset,
			HargaBeli:                   hargaBeli,
			NilaiResidu:                 nilaiResidu,
			SaldoAwal:                   saldoAwal,
			LinkAkunAsetTetap:           linkAkunAsetTetap,
			AkumulasiPenyusutanAwal:     akumulasiPenyusutanAwal,
			LinkAkunAkumulasiPenyusutan: linkAkunAkumulasiPenyusutan,
			TanggalPembelian:            parseDate(tanggalPembelianStr),
			TanggalDigunakan:            parseDate(tanggalDigunakanStr),
			TanggalStatusTidakAktif:     parseDate(tanggalStatusTidakAktifStr),
			UmurEkonomis:                umurEkonomis,
			Status:                      status,
			Aktif:                       strings.EqualFold(status, "aktif"),
			KartuAsetTetap:              kartuAsetTetap,
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

		if err := service.SaveInventaris(&obj); err == nil {
			successCount++
		} else {
			lastErr = err
		}
	}

	if successCount == 0 {
		if lastErr != nil {
			http.Error(w, "Gagal mengimpor data inventaris: "+lastErr.Error(), http.StatusInternalServerError)
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Tidak ada data inventaris yang berhasil diimpor (format mungkin salah atau data kosong)"))
		}
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf("Berhasil mengimpor %d data inventaris", successCount)))
}
