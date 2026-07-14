package handler

import (
	"encoding/json"
	"net/http"
	"sibumdes/internal/models"
	"sibumdes/internal/service"
	"strconv"
	"strings"
)

func normalizeJenisMapping(raw string) string {
	val := strings.ToLower(strings.TrimSpace(raw))
	val = strings.ReplaceAll(val, "-", "_")
	if val == "" {
		return "harian"
	}
	switch val {
	case "harian", "non_rutin", "umum", "jurnal":
		return val
	default:
		return "harian"
	}
}

func readMappingContext(r *http.Request) (*uint, string) {
	jenisFromQuery := r.URL.Query().Get("jenis_mapping")
	jenisFromForm := r.FormValue("jenis_mapping")
	jenisMapping := normalizeJenisMapping(jenisFromQuery)
	if jenisFromForm != "" {
		jenisMapping = normalizeJenisMapping(jenisFromForm)
	}

	sessionSlug := strings.TrimSpace(r.URL.Query().Get("session_slug"))
	if sessionSlug == "" {
		sessionSlug = strings.TrimSpace(r.FormValue("session_slug"))
	}

	var profileID *uint
	if sessionSlug != "" {
		user, err := service.GetUserBySlug(sessionSlug)
		isPengembang := false
		if err == nil && user != nil {
			profileName := strings.ToLower(strings.TrimSpace(user.ProfileBUMDes.NamaBUMDes))
			isPengembang = strings.Contains(profileName, "pengembang")
		}
		if err == nil && user != nil && !isPengembang && user.ProfileBUMDesID != nil && *user.ProfileBUMDesID != 0 {
			profileID = user.ProfileBUMDesID
		}
	}

	return profileID, jenisMapping
}

func GetMappingTransaksis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	profileID, jenisMapping := readMappingContext(r)
	data, err := service.GetAllMappingTransaksi(profileID, jenisMapping)
	if err != nil {
		http.Error(w, "Error fetching data", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func GetMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}
	profileID, jenisMapping := readMappingContext(r)
	item, err := service.GetMappingTransaksiBySlug(slug, profileID, jenisMapping)
	if err != nil {
		http.Error(w, "Data tidak ditemukan", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func SaveMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	slug := r.FormValue("slug")
	profileID, jenisMapping := readMappingContext(r)
	var item *models.MappingTransaksi

	if slug != "" {
		existing, err := service.GetMappingTransaksiBySlug(slug, profileID, jenisMapping)
		if err == nil && existing.ID > 0 {
			item = existing
		}
	}
	if item == nil {
		item = &models.MappingTransaksi{}
	}

	item.NamaMapping = r.FormValue("nama_mapping")
	item.KlasifikasiArusKas = r.FormValue("klasifikasi_arus_kas")
	item.CashInOut = r.FormValue("cash_in_out")
	item.KategoriArusKas = r.FormValue("kategori_arus_kas")
	item.JenisMapping = jenisMapping
	item.KategoriTransaksi = r.FormValue("kategori_transaksi")
	if item.KategoriTransaksi == "" {
		if item.CashInOut == "kas_keluar" {
			item.KategoriTransaksi = "keluar"
		} else {
			item.KategoriTransaksi = "masuk"
		}
	}
	item.TipeDefault = r.FormValue("tipe_default")
	if item.TipeDefault == "" {
		item.TipeDefault = "semua"
	}
	item.AkunDebet = r.FormValue("akun_debet")
	item.NominalDebet = r.FormValue("nominal_debet")
	item.AkunKredit = r.FormValue("akun_kredit")
	item.NominalKredit = r.FormValue("nominal_kredit")
	item.Keterangan = r.FormValue("keterangan")
	item.LinkAsetTetap = r.FormValue("link_aset_tetap") == "1"
	item.LinkPersediaan = r.FormValue("link_persediaan") == "1"
	item.LinkBkUtang = r.FormValue("link_bk_utang") == "1"
	item.LinkBkPiutang = r.FormValue("link_bk_piutang") == "1"
	item.LinkJurnalPenyesuaian = r.FormValue("link_jurnal_penyesuaian") == "1"

	// Bangun daftar baris jurnal (Details). Baris pertama selalu mengikuti
	// nilai akun_debet/akun_kredit di atas; baris tambahan dikirim sebagai
	// detail_akun_debet[] dan detail_akun_kredit[] (paralel berdasar index).
	form := r.Form
	if form == nil {
		form = map[string][]string{}
	}
	getAt := func(key string, idx int) string {
		vals := form[key]
		if idx < 0 || idx >= len(vals) {
			return ""
		}
		return strings.TrimSpace(vals[idx])
	}
	detailDebets := form["detail_akun_debet[]"]
	if len(detailDebets) == 0 {
		detailDebets = form["detail_akun_debet"]
	}
	detailKredits := form["detail_akun_kredit[]"]
	if len(detailKredits) == 0 {
		detailKredits = form["detail_akun_kredit"]
	}
	detailNominalDebets := form["detail_nominal_debet[]"]
	if len(detailNominalDebets) == 0 {
		detailNominalDebets = form["detail_nominal_debet"]
	}
	detailNominalKredits := form["detail_nominal_kredit[]"]
	if len(detailNominalKredits) == 0 {
		detailNominalKredits = form["detail_nominal_kredit"]
	}
	detailKeterangans := form["detail_keterangan[]"]
	if len(detailKeterangans) == 0 {
		detailKeterangans = form["detail_keterangan"]
	}
	detailLinkAsetTetaps := form["detail_link_aset_tetap[]"]
	if len(detailLinkAsetTetaps) == 0 {
		detailLinkAsetTetaps = form["detail_link_aset_tetap"]
	}
	detailLinkPersediaans := form["detail_link_persediaan[]"]
	if len(detailLinkPersediaans) == 0 {
		detailLinkPersediaans = form["detail_link_persediaan"]
	}
	detailLinkBkUtangs := form["detail_link_bk_utang[]"]
	if len(detailLinkBkUtangs) == 0 {
		detailLinkBkUtangs = form["detail_link_bk_utang"]
	}
	detailLinkBkPiutangs := form["detail_link_bk_piutang[]"]
	if len(detailLinkBkPiutangs) == 0 {
		detailLinkBkPiutangs = form["detail_link_bk_piutang"]
	}
	detailLinkJurnalPenyesuaians := form["detail_link_jurnal_penyesuaian[]"]
	if len(detailLinkJurnalPenyesuaians) == 0 {
		detailLinkJurnalPenyesuaians = form["detail_link_jurnal_penyesuaian"]
	}

	details := []models.MappingTransaksiDetail{}
	if strings.TrimSpace(item.AkunDebet) != "" || strings.TrimSpace(item.AkunKredit) != "" {
		details = append(details, models.MappingTransaksiDetail{
			Urutan:                1,
			AkunDebet:             item.AkunDebet,
			AkunKredit:            item.AkunKredit,
			NominalDebet:          item.NominalDebet,
			NominalKredit:         item.NominalKredit,
			LinkAsetTetap:         item.LinkAsetTetap,
			LinkPersediaan:        item.LinkPersediaan,
			LinkBkUtang:           item.LinkBkUtang,
			LinkBkPiutang:         item.LinkBkPiutang,
			LinkJurnalPenyesuaian: item.LinkJurnalPenyesuaian,
		})
	}
	maxAdditional := len(detailDebets)
	if len(detailKredits) > maxAdditional {
		maxAdditional = len(detailKredits)
	}
	for i := 0; i < maxAdditional; i++ {
		debit := strings.TrimSpace(getAt("detail_akun_debet[]", i))
		if debit == "" {
			debit = strings.TrimSpace(getAt("detail_akun_debet", i))
		}
		kredit := strings.TrimSpace(getAt("detail_akun_kredit[]", i))
		if kredit == "" {
			kredit = strings.TrimSpace(getAt("detail_akun_kredit", i))
		}
		if debit == "" && kredit == "" {
			continue
		}
		nomDebit := strings.TrimSpace(getAt("detail_nominal_debet[]", i))
		if nomDebit == "" {
			nomDebit = strings.TrimSpace(getAt("detail_nominal_debet", i))
		}
		nomKredit := strings.TrimSpace(getAt("detail_nominal_kredit[]", i))
		if nomKredit == "" {
			nomKredit = strings.TrimSpace(getAt("detail_nominal_kredit", i))
		}
		ket := strings.TrimSpace(getAt("detail_keterangan[]", i))
		if ket == "" {
			ket = strings.TrimSpace(getAt("detail_keterangan", i))
		}
		linkAsetTetap := strings.TrimSpace(getAt("detail_link_aset_tetap[]", i))
		if linkAsetTetap == "" {
			linkAsetTetap = strings.TrimSpace(getAt("detail_link_aset_tetap", i))
		}
		linkPersediaan := strings.TrimSpace(getAt("detail_link_persediaan[]", i))
		if linkPersediaan == "" {
			linkPersediaan = strings.TrimSpace(getAt("detail_link_persediaan", i))
		}
		linkBkUtang := strings.TrimSpace(getAt("detail_link_bk_utang[]", i))
		if linkBkUtang == "" {
			linkBkUtang = strings.TrimSpace(getAt("detail_link_bk_utang", i))
		}
		linkBkPiutang := strings.TrimSpace(getAt("detail_link_bk_piutang[]", i))
		if linkBkPiutang == "" {
			linkBkPiutang = strings.TrimSpace(getAt("detail_link_bk_piutang", i))
		}
		linkJurnalPenyesuaian := strings.TrimSpace(getAt("detail_link_jurnal_penyesuaian[]", i))
		if linkJurnalPenyesuaian == "" {
			linkJurnalPenyesuaian = strings.TrimSpace(getAt("detail_link_jurnal_penyesuaian", i))
		}
		_ = detailNominalDebets
		_ = detailNominalKredits
		_ = detailKeterangans
		_ = detailLinkAsetTetaps
		_ = detailLinkPersediaans
		_ = detailLinkBkUtangs
		_ = detailLinkBkPiutangs
		_ = detailLinkJurnalPenyesuaians
		details = append(details, models.MappingTransaksiDetail{
			Urutan:                len(details) + 1,
			AkunDebet:             debit,
			AkunKredit:            kredit,
			NominalDebet:          nomDebit,
			NominalKredit:         nomKredit,
			Keterangan:            ket,
			LinkAsetTetap:         linkAsetTetap == "1",
			LinkPersediaan:        linkPersediaan == "1",
			LinkBkUtang:           linkBkUtang == "1",
			LinkBkPiutang:         linkBkPiutang == "1",
			LinkJurnalPenyesuaian: linkJurnalPenyesuaian == "1",
		})
	}
	item.Details = details
	// Sinkronkan field legacy supaya tetap kompatibel dengan modul yang
	// masih membaca AkunDebet/AkunKredit langsung dari MappingTransaksi.
	if len(details) > 0 {
		item.AkunDebet = details[0].AkunDebet
		item.AkunKredit = details[0].AkunKredit
		item.NominalDebet = details[0].NominalDebet
		item.NominalKredit = details[0].NominalKredit
		item.LinkAsetTetap = details[0].LinkAsetTetap
		item.LinkPersediaan = details[0].LinkPersediaan
		item.LinkBkUtang = details[0].LinkBkUtang
		item.LinkBkPiutang = details[0].LinkBkPiutang
		item.LinkJurnalPenyesuaian = details[0].LinkJurnalPenyesuaian
	}

	if unitUsahaIDStr := r.FormValue("unit_usaha_id"); unitUsahaIDStr != "" {
		if id, err := strconv.ParseUint(unitUsahaIDStr, 10, 64); err == nil && id > 0 {
			uid := uint(id)
			item.UnitUsahaID = &uid
		}
	}

	if profileID != nil {
		item.ProfileBUMDesID = profileID
	}

	if err := service.SaveMappingTransaksi(item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"message": "Mapping transaksi berhasil disimpan", "slug": item.Slug})
}

func DeleteMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}
	profileID, jenisMapping := readMappingContext(r)
	if err := service.DeleteMappingTransaksiBySlug(slug, profileID, jenisMapping); err != nil {
		http.Error(w, "Gagal menghapus data", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Mapping transaksi berhasil dihapus"))
}

func DeleteAllMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	profileID, jenisMapping := readMappingContext(r)
	if err := service.DeleteAllMappingTransaksi(profileID, jenisMapping); err != nil {
		http.Error(w, "Gagal menghapus semua data", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Semua data mapping transaksi berhasil dihapus"})
}

// SeedHarianMappingTransaksi memasukkan data default mapping harian sesuai
// template Harian.xlsx untuk profil BUMDes yang sedang login.
func SeedHarianMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseForm(); err != nil {
		// abaikan error parse form; query string masih bisa dibaca
		_ = err
	}
	profileID, _ := readMappingContext(r)
	result, err := service.SeedHarianMappingTransaksi(profileID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Data mapping transaksi harian berhasil di-seed",
		"inserted": result.Inserted,
		"skipped":  result.Skipped,
		"total":    result.Total,
		"warnings": result.Warnings,
	})
}

// SeedNonRutinMappingTransaksi memasukkan data default mapping non rutin
// sesuai template NonRutin.xlsx untuk profil BUMDes yang sedang login.
func SeedNonRutinMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseForm(); err != nil {
		_ = err
	}
	profileID, _ := readMappingContext(r)
	result, err := service.SeedNonRutinMappingTransaksi(profileID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Data mapping transaksi non rutin berhasil di-seed",
		"inserted": result.Inserted,
		"skipped":  result.Skipped,
		"total":    result.Total,
		"warnings": result.Warnings,
	})
}

// SeedLainnyaMappingTransaksi memasukkan data default mapping transaksi
// lainnya sesuai template TransaksiLainnya.xlsx untuk profil login.
func SeedLainnyaMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseForm(); err != nil {
		_ = err
	}
	profileID, _ := readMappingContext(r)
	result, err := service.SeedLainnyaMappingTransaksi(profileID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Data mapping transaksi lainnya berhasil di-seed",
		"inserted": result.Inserted,
		"skipped":  result.Skipped,
		"total":    result.Total,
		"warnings": result.Warnings,
	})
}

// SeedJurnalMappingTransaksi memasukkan data default mapping jurnal sesuai
// template Jurnal.xlsx untuk profile login.
func SeedJurnalMappingTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseForm(); err != nil {
		_ = err
	}
	profileID, _ := readMappingContext(r)
	result, err := service.SeedJurnalMappingTransaksi(profileID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Data mapping jurnal berhasil di-seed",
		"inserted": result.Inserted,
		"skipped":  result.Skipped,
		"total":    result.Total,
		"warnings": result.Warnings,
	})
}
