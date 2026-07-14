package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/service"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	jurnalGeminiMaxCallsPerRequest = 1
	jurnalGeminiHTTPTimeout        = 2 * time.Second
)

type JurnalRekapRow struct {
	Tanggal               string  `json:"tanggal"`
	DeskripsiTransaksi    string  `json:"deskripsi_transaksi"`
	Keterangan            string  `json:"keterangan"`
	NamaCustSupplier      string  `json:"nama_cust_supplier"`
	UnitUsaha             string  `json:"unit_usaha"`
	Nominal               float64 `json:"nominal"`
	TunaiKredit           string  `json:"tunai_kredit"`
	JurnalDebetAkun       string  `json:"jurnal_debet_akun"`
	JurnalDebetNominal    float64 `json:"jurnal_debet_nominal"`
	JurnalKreditAkun      string  `json:"jurnal_kredit_akun"`
	JurnalKreditNominal   float64 `json:"jurnal_kredit_nominal"`
	LinkAsetTetap         bool    `json:"link_aset_tetap"`
	LinkPersediaan        bool    `json:"link_persediaan"`
	LinkBkUtang           bool    `json:"link_bk_utang"`
	LinkBkPiutang         bool    `json:"link_bk_piutang"`
	LinkJurnalPenyesuaian bool    `json:"link_jurnal_penyesuaian"`
}

type JurnalRekapAkunRow struct {
	KodeAkun string  `json:"kode_akun"`
	NamaAkun string  `json:"nama_akun"`
	Debit    float64 `json:"debit"`
	Kredit   float64 `json:"kredit"`
}

type HistoriAkunRow struct {
	Tanggal            string  `json:"tanggal"`
	UnitUsaha          string  `json:"unit_usaha"`
	DeskripsiTransaksi string  `json:"deskripsi_transaksi"`
	Keterangan         string  `json:"keterangan"`
	Debit              float64 `json:"debit"`
	Kredit             float64 `json:"kredit"`
	Saldo              float64 `json:"saldo"`
}

type HistoriAkunGroup struct {
	KodeAkun    string           `json:"kode_akun"`
	NamaAkun    string           `json:"nama_akun"`
	SaldoNormal string           `json:"saldo_normal"`
	Rows        []HistoriAkunRow `json:"rows"`
}

type JurnalWorkbookRow struct {
	Tanggal               string  `json:"tanggal"`
	ProfileBUMDesName     string  `json:"profile_bumdes_name"`
	UnitUsahaID           uint    `json:"unit_usaha_id"`
	UnitUsaha             string  `json:"unit_usaha"`
	DeskripsiTransaksi    string  `json:"deskripsi_transaksi"`
	Keterangan            string  `json:"keterangan"`
	AkunDebit             string  `json:"akun_debit"`
	NominalDebit          float64 `json:"nominal_debit"`
	AkunKredit            string  `json:"akun_kredit"`
	NominalKredit         float64 `json:"nominal_kredit"`
	SumberMapping         string  `json:"sumber_mapping"`
	LinkAsetTetap         bool    `json:"link_aset_tetap"`
	LinkPersediaan        bool    `json:"link_persediaan"`
	LinkBkUtang           bool    `json:"link_bk_utang"`
	LinkBkPiutang         bool    `json:"link_bk_piutang"`
	LinkJurnalPenyesuaian bool    `json:"link_jurnal_penyesuaian"`
}

// KartuAsetTetapGroup adalah register per-aset (satu baris per aset) sesuai format Excel cek2.xlsx
type JurnalRow struct {
	Tanggal       string  `json:"tanggal"`
	UnitUsaha     string  `json:"unit_usaha"`
	DeskripsiTx   string  `json:"deskripsi_tx"`
	Keterangan    string  `json:"keterangan"`
	AkunDebit     string  `json:"akun_debit"`
	NominalDebit  float64 `json:"nominal_debit"`
	AkunKredit    string  `json:"akun_kredit"`
	NominalKredit float64 `json:"nominal_kredit"`
	SumberMapping string  `json:"sumber_mapping"`
	AsetTetap     bool    `json:"aset_tetap"`
}

type JurnalGroup struct {
	ProfileBUMDesName string      `json:"profile_bumdes_name"`
	UnitUsahaID       uint        `json:"unit_usaha_id"`
	UnitUsaha         string      `json:"unit_usaha"`
	Rows              []JurnalRow `json:"rows"`
}

type KartuAsetTetapGroup struct {
	ProfileBUMDesName    string  `json:"profile_bumdes_name"`
	UnitUsahaID          uint    `json:"unit_usaha_id"`
	UnitUsaha            string  `json:"unit_usaha"`
	AsetSlug             string  `json:"aset_slug"`
	KodeAset             string  `json:"kode_aset"`
	NamaAset             string  `json:"nama_aset"`
	MerkAset             string  `json:"merk_aset"`
	KategoriAset         string  `json:"kategori_aset"`
	TanggalPembelian     string  `json:"tanggal_pembelian"`
	TanggalDigunakan     string  `json:"tanggal_digunakan"`
	JumlahUnit           float64 `json:"jumlah_unit"`
	HargaSatuan          float64 `json:"harga_satuan"`
	HargaPerolehan       float64 `json:"harga_perolehan"`
	NilaiResidu          float64 `json:"nilai_residu"`
	UmurEkonomis         int     `json:"umur_ekonomis"`
	UmurEkonomisBulan    int     `json:"umur_ekonomis_bulan"`
	BebanPerBulan        float64 `json:"beban_per_bulan"`
	BebanPeriodeBerjalan float64 `json:"beban_periode_berjalan"`
	AkumulasiPenyusutan  float64 `json:"akumulasi_penyusutan"`
	NilaiBuku            float64 `json:"nilai_buku"`
	Status               string  `json:"status"`
	TanggalTidakAktif    string  `json:"tanggal_tidak_aktif"`
	LinkAkunAset         string  `json:"link_akun_aset"`
	LinkAkunAkumulasi    string  `json:"link_akun_akumulasi"`
	LinkAkunBeban        string  `json:"link_akun_beban"`
	Satuan               string  `json:"satuan"`
}

type KartuPersediaanRow struct {
	Tanggal       string  `json:"tanggal"`
	Deskripsi     string  `json:"deskripsi"`
	Keterangan    string  `json:"keterangan"`
	MasukQty      string  `json:"masuk_qty"`
	MasukHarga    string  `json:"masuk_harga"`
	MasukNominal  float64 `json:"masuk_nominal"`
	KeluarQty     string  `json:"keluar_qty"`
	KeluarHarga   string  `json:"keluar_harga"`
	KeluarNominal float64 `json:"keluar_nominal"`
	SaldoQty      string  `json:"saldo_qty"`
	SaldoHarga    string  `json:"saldo_harga"`
	SaldoNominal  float64 `json:"saldo_nominal"`
	Sumber        string  `json:"sumber"`
	IsManual      bool    `json:"is_manual"`
	ManualID      uint    `json:"manual_id,omitempty"`
}

type KartuPersediaanGroup struct {
	ProfileBUMDesName string               `json:"profile_bumdes_name"`
	UnitUsahaID       uint                 `json:"unit_usaha_id"`
	UnitUsaha         string               `json:"unit_usaha"`
	BarangSlug        string               `json:"barang_slug"`
	AkunPersediaan    string               `json:"akun_persediaan"`
	NamaReferensi     string               `json:"nama_referensi"`
	Satuan            string               `json:"satuan"`
	Rows              []KartuPersediaanRow `json:"rows"`
}

type BukuPembantuPiutangRow struct {
	Tanggal      string  `json:"tanggal"`
	Deskripsi    string  `json:"deskripsi"`
	Keterangan   string  `json:"keterangan"`
	RefTransaksi string  `json:"ref_transaksi"`
	Masuk        float64 `json:"masuk"`
	Keluar       float64 `json:"keluar"`
	SaldoPiutang float64 `json:"saldo_piutang"`
	Sumber       string  `json:"sumber"`
}

type BukuPembantuPiutangGroup struct {
	ProfileBUMDesName string                   `json:"profile_bumdes_name"`
	UnitUsahaID       uint                     `json:"unit_usaha_id"`
	UnitUsaha         string                   `json:"unit_usaha"`
	PelangganSlug     string                   `json:"pelanggan_slug"`
	PelangganKode     string                   `json:"pelanggan_kode"`
	PelangganName     string                   `json:"pelanggan_name"`
	LinkAkun          string                   `json:"link_akun"`
	Rows              []BukuPembantuPiutangRow `json:"rows"`
}

type BukuPembantuUtangRow struct {
	Tanggal      string  `json:"tanggal"`
	Deskripsi    string  `json:"deskripsi"`
	Keterangan   string  `json:"keterangan"`
	RefTransaksi string  `json:"ref_transaksi"`
	Masuk        float64 `json:"masuk"`
	Keluar       float64 `json:"keluar"`
	SaldoUtang   float64 `json:"saldo_utang"`
	Sumber       string  `json:"sumber"`
}

type BukuPembantuUtangGroup struct {
	ProfileBUMDesName string                 `json:"profile_bumdes_name"`
	UnitUsahaID       uint                   `json:"unit_usaha_id"`
	UnitUsaha         string                 `json:"unit_usaha"`
	SupplierSlug      string                 `json:"supplier_slug"`
	SupplierKode      string                 `json:"supplier_kode"`
	SupplierName      string                 `json:"supplier_name"`
	LinkAkun          string                 `json:"link_akun"`
	Rows              []BukuPembantuUtangRow `json:"rows"`
}

type jurnalMappingPromptContext struct {
	SourceLabel     string
	SourceText      string
	ProfileBUMDesID uint
	UnitUsahaID     uint
	ProfileName     string
	UnitName        string
	TxKeterangan    string
	TxDeskripsi     string
	TipeKas         string
	StatusBayar     string
}

type jurnalMappingChoice struct {
	Index int `json:"index"`
}

type scoredJurnalMapping struct {
	mapping models.MappingTransaksi
	score   int
}

type jurnalGeminiBudget struct {
	remaining int
}

func resolveWorkbookScope(r *http.Request) (*uint, *uint) {
	sessionSlug := strings.TrimSpace(r.URL.Query().Get("session_slug"))
	var reqProfileID *uint
	if sessionSlug != "" {
		loggedUser, err := service.GetUserBySlug(sessionSlug)
		if err == nil && loggedUser != nil && loggedUser.ProfileBUMDesID != nil && *loggedUser.ProfileBUMDesID != 0 {
			reqProfileID = loggedUser.ProfileBUMDesID
		}
	}

	unitUsahaID := parseOptionalUintQuery(r, "unit_usaha_id")
	return reqProfileID, unitUsahaID
}

func parseOptionalUintQuery(r *http.Request, key string) *uint {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return nil
	}
	parsed, err := strconv.ParseUint(raw, 10, 32)
	if err != nil || parsed == 0 {
		return nil
	}
	value := uint(parsed)
	return &value
}

func filterWorkbookMappingsByUnit(mappings []models.MappingTransaksi, unitUsahaID *uint) []models.MappingTransaksi {
	if unitUsahaID == nil || *unitUsahaID == 0 {
		return mappings
	}

	filtered := make([]models.MappingTransaksi, 0, len(mappings))
	for _, mapping := range mappings {
		unitName := strings.ToLower(strings.TrimSpace(mapping.UnitUsaha.NamaUnitUsaha))
		isCrossUnitBUMDesUmum := strings.Contains(unitName, "bumdes") && strings.Contains(unitName, "umum")
		if mapping.UnitUsahaID == nil || *mapping.UnitUsahaID == 0 || *mapping.UnitUsahaID == *unitUsahaID || isCrossUnitBUMDesUmum {
			filtered = append(filtered, mapping)
		}
	}
	return filtered
}

func filterWorkbookTransactionsByUnit(transaksis []models.Transaksi, unitUsahaID *uint) []models.Transaksi {
	if unitUsahaID == nil || *unitUsahaID == 0 {
		return transaksis
	}

	filtered := make([]models.Transaksi, 0, len(transaksis))
	for _, tx := range transaksis {
		if tx.UnitUsahaID == *unitUsahaID {
			filtered = append(filtered, tx)
		}
	}
	return filtered
}

func filterWorkbookBarangsByUnit(barangs []models.Barang, unitUsahaID *uint) []models.Barang {
	if unitUsahaID == nil || *unitUsahaID == 0 {
		return barangs
	}

	filtered := make([]models.Barang, 0, len(barangs))
	for _, barang := range barangs {
		if barang.UnitUsahaID != nil && *barang.UnitUsahaID == *unitUsahaID {
			filtered = append(filtered, barang)
		}
	}
	return filtered
}

func filterWorkbookPelanggansByUnit(pelanggans []models.Pelanggan, unitUsahaID *uint) []models.Pelanggan {
	if unitUsahaID == nil || *unitUsahaID == 0 {
		return pelanggans
	}

	filtered := make([]models.Pelanggan, 0, len(pelanggans))
	for _, pelanggan := range pelanggans {
		if pelanggan.UnitUsahaID != nil && *pelanggan.UnitUsahaID == *unitUsahaID {
			filtered = append(filtered, pelanggan)
		}
	}
	return filtered
}

func filterWorkbookSuppliersByUnit(suppliers []models.Supplier, unitUsahaID *uint) []models.Supplier {
	if unitUsahaID == nil || *unitUsahaID == 0 {
		return suppliers
	}

	filtered := make([]models.Supplier, 0, len(suppliers))
	for _, supplier := range suppliers {
		if supplier.UnitUsahaID != nil && *supplier.UnitUsahaID == *unitUsahaID {
			filtered = append(filtered, supplier)
		}
	}
	return filtered
}

func GetJurnalRekapitulasi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reqProfileID, unitUsahaID := resolveWorkbookScope(r)
	jurnalRows, err := buildJurnalWorkbookRows(reqProfileID, unitUsahaID)
	if err != nil {
		http.Error(w, "Error fetching jurnal", http.StatusInternalServerError)
		return
	}

	rekapRows, err := buildJurnalRekapAkunRows(reqProfileID, jurnalRows)
	if err != nil {
		http.Error(w, "Error building jurnal rekapitulasi", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rekapRows)
}

type jurnalWorkbookDetail struct {
	AkunDebet             string
	AkunKredit            string
	LinkAsetTetap         bool
	LinkPersediaan        bool
	LinkBkUtang           bool
	LinkBkPiutang         bool
	LinkJurnalPenyesuaian bool
}

func GetHistoriAkun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reqProfileID, unitUsahaID := resolveWorkbookScope(r)
	jurnalRows, err := buildJurnalWorkbookRows(reqProfileID, unitUsahaID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error generating histori akun: %v", err), http.StatusInternalServerError)
		return
	}

	historiRows, err := buildHistoriAkunRows(reqProfileID, jurnalRows)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error building histori akun: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(historiRows)
}

func GetJurnal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reqProfileID, unitUsahaID := resolveWorkbookScope(r)
	rows, err := buildJurnalWorkbookRows(reqProfileID, unitUsahaID)
	if err != nil {
		http.Error(w, "Error fetching jurnal", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rows)
}

func buildJurnalWorkbookRows(reqProfileID *uint, unitUsahaID *uint) ([]JurnalWorkbookRow, error) {
	transaksis, err := service.GetTransactionsByProfile(reqProfileID)
	if err != nil {
		return nil, err
	}
	transaksis = filterWorkbookTransactionsByUnit(transaksis, unitUsahaID)

	manualQuery := config.DB.Order("tanggal asc, id asc")
	if reqProfileID != nil {
		manualQuery = manualQuery.Where("profile_bum_des_id = ?", *reqProfileID)
	}
	if unitUsahaID != nil {
		manualQuery = manualQuery.Where("unit_usaha_id = ?", *unitUsahaID)
	}
	manualEntries := []models.KartuPersediaanManual{}
	if err := manualQuery.Find(&manualEntries).Error; err != nil {
		return nil, err
	}

	mappings, err := getAllJurnalMappings(reqProfileID)
	if err != nil {
		return nil, err
	}
	mappings = filterWorkbookMappingsByUnit(mappings, unitUsahaID)

	mappingBySlug := make(map[string]models.MappingTransaksi, len(mappings))
	mappingByName := make(map[string]models.MappingTransaksi, len(mappings))
	for _, mapping := range mappings {
		if slug := strings.TrimSpace(mapping.Slug); slug != "" {
			if _, exists := mappingBySlug[slug]; !exists {
				mappingBySlug[slug] = mapping
			}
		}
		key := normalizeJurnalLookupKey(mapping.NamaMapping)
		if key == "" {
			continue
		}
		if _, exists := mappingByName[key]; !exists {
			mappingByName[key] = mapping
		}
	}

	profileNameByID := map[uint]string{}
	if reqProfileID != nil && *reqProfileID != 0 {
		var profile models.ProfileBUMDes
		if err := config.DB.First(&profile, *reqProfileID).Error; err == nil {
			profileNameByID[*reqProfileID] = fallback(profile.NamaBUMDes, "-")
		}
	}
	for _, tx := range transaksis {
		if tx.ProfileBUMDes != nil && tx.ProfileBUMDes.ID != 0 {
			if _, exists := profileNameByID[tx.ProfileBUMDes.ID]; !exists {
				profileNameByID[tx.ProfileBUMDes.ID] = fallback(tx.ProfileBUMDes.NamaBUMDes, "-")
			}
		}
	}
	for _, entry := range manualEntries {
		if entry.ProfileBUMDesID == nil || *entry.ProfileBUMDesID == 0 {
			continue
		}
		if _, exists := profileNameByID[*entry.ProfileBUMDesID]; exists {
			continue
		}
		var profile models.ProfileBUMDes
		if err := config.DB.First(&profile, *entry.ProfileBUMDesID).Error; err == nil {
			profileNameByID[*entry.ProfileBUMDesID] = fallback(profile.NamaBUMDes, "-")
		}
	}

	unitNameByID := map[uint]string{}
	for _, tx := range transaksis {
		if tx.UnitUsaha != nil && tx.UnitUsaha.ID != 0 {
			if _, exists := unitNameByID[tx.UnitUsaha.ID]; !exists {
				unitNameByID[tx.UnitUsaha.ID] = fallback(tx.UnitUsaha.NamaUnitUsaha, "-")
			}
		}
	}
	for _, entry := range manualEntries {
		if entry.UnitUsahaID == 0 {
			continue
		}
		if _, exists := unitNameByID[entry.UnitUsahaID]; exists {
			continue
		}
		var unit models.UnitUsaha
		if err := config.DB.First(&unit, entry.UnitUsahaID).Error; err == nil {
			unitNameByID[entry.UnitUsahaID] = fallback(unit.NamaUnitUsaha, "-")
		}
	}

	barangs, err := service.GetAllBarang(reqProfileID)
	if err != nil {
		return nil, err
	}
	barangs = filterWorkbookBarangsByUnit(barangs, unitUsahaID)

	type inventoryState struct {
		Qty     float64
		Nominal float64
	}
	inventoryStateByBarang := map[string]inventoryState{}
	trackedBarangs := make([]models.Barang, 0, len(barangs))
	for _, barang := range barangs {
		if !barang.KartuPersediaan {
			continue
		}
		slug := strings.TrimSpace(barang.Slug)
		if slug == "" {
			continue
		}
		nominal := float64(barang.SaldoAwalNominal)
		if nominal == 0 && barang.SaldoAwalQty > 0 && barang.HargaBeliAwal > 0 {
			nominal = barang.SaldoAwalQty * barang.HargaBeliAwal
		}
		inventoryStateByBarang[slug] = inventoryState{Qty: barang.SaldoAwalQty, Nominal: nominal}
		trackedBarangs = append(trackedBarangs, barang)
	}

	sort.SliceStable(manualEntries, func(i, j int) bool {
		left := manualEntries[i].CreatedAt
		right := manualEntries[j].CreatedAt
		if left.IsZero() {
			left = manualEntries[i].Tanggal
		}
		if right.IsZero() {
			right = manualEntries[j].Tanggal
		}
		if left.Equal(right) {
			return manualEntries[i].ID < manualEntries[j].ID
		}
		return left.Before(right)
	})
	manualCursor := 0

	findMatchedBarangForTransaksi := func(tx models.Transaksi) *models.Barang {
		for i := range trackedBarangs {
			barang := &trackedBarangs[i]
			if barang.UnitUsahaID == nil || *barang.UnitUsahaID != tx.UnitUsahaID {
				continue
			}
			if transaksiMatchesBarang(tx, *barang) {
				return barang
			}
		}
		return nil
	}

	rows := make([]JurnalWorkbookRow, 0, len(transaksis)+len(manualEntries))

	for _, tx := range transaksis {
		txSortTime := tx.CreatedAt
		if txSortTime.IsZero() {
			txSortTime = tx.Tanggal
		}
		for manualCursor < len(manualEntries) {
			entry := manualEntries[manualCursor]
			entrySortTime := entry.CreatedAt
			if entrySortTime.IsZero() {
				entrySortTime = entry.Tanggal
			}
			if entrySortTime.After(txSortTime) {
				break
			}

			slug := strings.TrimSpace(entry.BarangSlug)
			state, ok := inventoryStateByBarang[slug]
			if ok {
				nominal := entry.Qty * entry.Harga
				if strings.EqualFold(strings.TrimSpace(entry.Jenis), "masuk") {
					state.Qty += entry.Qty
					state.Nominal += nominal
				} else {
					state.Qty -= entry.Qty
					state.Nominal -= nominal
				}
				inventoryStateByBarang[slug] = state
			}
			manualCursor++
		}

		mapping, hasMapping := mappingBySlug[strings.TrimSpace(tx.MappingSlug)]
		if !hasMapping {
			mapping, hasMapping = mappingByName[normalizeJurnalLookupKey(tx.Deskripsi)]
		}

		if !strings.EqualFold(strings.TrimSpace(tx.Validasi), "Sudah") {
			if !(hasMapping && mappingHasJurnalPenyesuaianLink(mapping)) {
				continue
			}
		}

		profileName := "-"
		if tx.ProfileBUMDes != nil {
			profileName = fallback(tx.ProfileBUMDes.NamaBUMDes, "-")
		}

		unitName := "-"
		if tx.UnitUsaha != nil {
			unitName = fallback(tx.UnitUsaha.NamaUnitUsaha, "-")
		}

		deskripsi := firstNonEmpty(tx.Deskripsi, tx.Keterangan, "-")

		matchedBarang := findMatchedBarangForTransaksi(tx)
		matchedBarangSlug := ""
		mutationQty := extractInventoryQuantity(firstNonEmpty(tx.Keterangan, tx.Deskripsi))
		mutationMovement := ""
		avgRateBefore := 0.0
		if matchedBarang != nil {
			matchedBarangSlug = strings.TrimSpace(matchedBarang.Slug)
			state := inventoryStateByBarang[matchedBarangSlug]
			avgRateBefore = computeAverageInventoryRate(state.Qty, state.Nominal)
		}

		if hasMapping {
			details := mapping.Details
			if len(details) == 0 {
				details = []models.MappingTransaksiDetail{{
					AkunDebet:             mapping.AkunDebet,
					AkunKredit:            mapping.AkunKredit,
					LinkAsetTetap:         mapping.LinkAsetTetap,
					LinkPersediaan:        mapping.LinkPersediaan,
					LinkBkUtang:           mapping.LinkBkUtang,
					LinkBkPiutang:         mapping.LinkBkPiutang,
					LinkJurnalPenyesuaian: mapping.LinkJurnalPenyesuaian,
				}}
			}

			for index, detail := range details {
				_, detailMovement := resolvePersediaanMutation(detail)
				if mutationMovement == "" && detailMovement != "" {
					mutationMovement = detailMovement
				}

				nominal := tx.Nominal
				sumber := "Transaksi"
				if index > 0 {
					if detailMovement == "keluar" && mutationQty > 0 && avgRateBefore > 0 {
						nominal = mutationQty * avgRateBefore
					}
					sumber = "Transaksi Child"
				}

				akunDebet := resolveJurnalAccountValue(strings.TrimSpace(detail.AkunDebet), tx.TipeKas, true)
				akunKredit := resolveJurnalAccountValue(strings.TrimSpace(detail.AkunKredit), tx.TipeKas, false)
				if index == 0 {
					if strings.TrimSpace(tx.AkunDebet) != "" {
						akunDebet = strings.TrimSpace(tx.AkunDebet)
					}
					if strings.TrimSpace(tx.AkunKredit) != "" {
						akunKredit = strings.TrimSpace(tx.AkunKredit)
					}
				}

				rows = append(rows, JurnalWorkbookRow{
					Tanggal:               tx.Tanggal.Format("2006-01-02"),
					ProfileBUMDesName:     profileName,
					UnitUsahaID:           tx.UnitUsahaID,
					UnitUsaha:             unitName,
					DeskripsiTransaksi:    deskripsi,
					Keterangan:            fallback(tx.Keterangan, "-"),
					AkunDebit:             akunDebet,
					NominalDebit:          nominal,
					AkunKredit:            akunKredit,
					NominalKredit:         nominal,
					SumberMapping:         sumber,
					LinkAsetTetap:         mapping.LinkAsetTetap || detail.LinkAsetTetap,
					LinkPersediaan:        mapping.LinkPersediaan || detail.LinkPersediaan,
					LinkBkUtang:           mapping.LinkBkUtang || detail.LinkBkUtang,
					LinkBkPiutang:         mapping.LinkBkPiutang || detail.LinkBkPiutang,
					LinkJurnalPenyesuaian: mapping.LinkJurnalPenyesuaian || detail.LinkJurnalPenyesuaian,
				})
			}

			if matchedBarangSlug != "" && mutationMovement != "" {
				state := inventoryStateByBarang[matchedBarangSlug]
				if mutationMovement == "masuk" {
					if mutationQty > 0 {
						state.Qty += mutationQty
					}
					state.Nominal += tx.Nominal
				} else {
					keluarNominal := tx.Nominal
					if mutationQty > 0 && avgRateBefore > 0 {
						keluarNominal = mutationQty * avgRateBefore
						state.Qty -= mutationQty
					}
					state.Nominal -= keluarNominal
				}
				inventoryStateByBarang[matchedBarangSlug] = state
			}
			continue
		}

		akunDebet := resolveJurnalAccountValue(strings.TrimSpace(tx.AkunDebet), tx.TipeKas, true)
		akunKredit := resolveJurnalAccountValue(strings.TrimSpace(tx.AkunKredit), tx.TipeKas, false)

		rows = append(rows, JurnalWorkbookRow{
			Tanggal:               tx.Tanggal.Format("2006-01-02"),
			ProfileBUMDesName:     profileName,
			UnitUsahaID:           tx.UnitUsahaID,
			UnitUsaha:             unitName,
			DeskripsiTransaksi:    deskripsi,
			Keterangan:            fallback(tx.Keterangan, "-"),
			AkunDebit:             akunDebet,
			NominalDebit:          tx.Nominal,
			AkunKredit:            akunKredit,
			NominalKredit:         tx.Nominal,
			SumberMapping:         "Transaksi",
			LinkAsetTetap:         false,
			LinkPersediaan:        false,
			LinkBkUtang:           false,
			LinkBkPiutang:         false,
			LinkJurnalPenyesuaian: false,
		})
	}

	for _, manual := range manualEntries {
		mapping, hasMapping := mappingByName[normalizeJurnalLookupKey(manual.Deskripsi)]
		if !hasMapping {
			continue
		}
		if !mapping.LinkJurnalPenyesuaian {
			continue
		}

		nominal := manual.Qty * manual.Harga
		if nominal <= 0 {
			continue
		}

		profileName := "-"
		if manual.ProfileBUMDesID != nil && *manual.ProfileBUMDesID != 0 {
			if name, ok := profileNameByID[*manual.ProfileBUMDesID]; ok && strings.TrimSpace(name) != "" {
				profileName = name
			}
		}

		unitName := "-"
		if name, ok := unitNameByID[manual.UnitUsahaID]; ok && strings.TrimSpace(name) != "" {
			unitName = name
		}

		details := mapping.Details
		if len(details) == 0 {
			details = []models.MappingTransaksiDetail{{
				AkunDebet:  mapping.AkunDebet,
				AkunKredit: mapping.AkunKredit,
			}}
		}

		for _, detail := range details {
			akunDebet := resolveJurnalAccountValue(strings.TrimSpace(detail.AkunDebet), "kurang", true)
			akunKredit := resolveJurnalAccountValue(strings.TrimSpace(detail.AkunKredit), "kurang", false)

			rows = append(rows, JurnalWorkbookRow{
				Tanggal:               manual.Tanggal.Format("2006-01-02"),
				ProfileBUMDesName:     profileName,
				UnitUsahaID:           manual.UnitUsahaID,
				UnitUsaha:             unitName,
				DeskripsiTransaksi:    firstNonEmpty(strings.TrimSpace(manual.Deskripsi), "Input Manual Kartu Persediaan"),
				Keterangan:            firstNonEmpty(strings.TrimSpace(manual.Keterangan), "Input Manual Kartu Persediaan"),
				AkunDebit:             akunDebet,
				NominalDebit:          nominal,
				AkunKredit:            akunKredit,
				NominalKredit:         nominal,
				SumberMapping:         "Kartu Persediaan Manual",
				LinkAsetTetap:         mapping.LinkAsetTetap,
				LinkPersediaan:        mapping.LinkPersediaan,
				LinkBkUtang:           mapping.LinkBkUtang,
				LinkBkPiutang:         mapping.LinkBkPiutang,
				LinkJurnalPenyesuaian: mapping.LinkJurnalPenyesuaian,
			})
		}
	}

	return rows, nil
}

func buildJurnalRekapAkunRows(reqProfileID *uint, jurnalRows []JurnalWorkbookRow) ([]JurnalRekapAkunRow, error) {
	coaEntries, err := service.GetAllChartOfAccounts(reqProfileID, false)
	if err != nil {
		return nil, err
	}

	coaByCode := make(map[string]string, len(coaEntries))
	for _, entry := range coaEntries {
		code := strings.TrimSpace(entry.KodeAkun)
		name := strings.TrimSpace(entry.NamaAkun)
		if code == "" || name == "" {
			continue
		}
		if _, exists := coaByCode[code]; !exists {
			coaByCode[code] = name
		}
	}

	accumulator := make(map[string]*JurnalRekapAkunRow)

	addAmount := func(rawAkun string, isDebit bool, amount float64) {
		if amount == 0 {
			return
		}

		kodeAkun, namaAkun := parseJurnalAkunParts(rawAkun)
		lookupKey := kodeAkun
		if lookupKey == "" {
			lookupKey = "text:" + strings.ToLower(strings.TrimSpace(namaAkun))
		}

		row, exists := accumulator[lookupKey]
		if !exists {
			displayCode := kodeAkun
			if displayCode == "" {
				displayCode = "-"
			}

			finalName := strings.TrimSpace(namaAkun)
			if kodeAkun != "" {
				if coaName, ok := coaByCode[kodeAkun]; ok && strings.TrimSpace(coaName) != "" {
					finalName = strings.TrimSpace(coaName)
				}
			}
			if finalName == "" {
				finalName = "-"
			}

			row = &JurnalRekapAkunRow{
				KodeAkun: displayCode,
				NamaAkun: finalName,
			}
			accumulator[lookupKey] = row
		}

		if isDebit {
			row.Debit += amount
		} else {
			row.Kredit += amount
		}
	}

	for _, row := range jurnalRows {
		addAmount(row.AkunDebit, true, row.NominalDebit)
		addAmount(row.AkunKredit, false, row.NominalKredit)
	}

	rekapRows := make([]JurnalRekapAkunRow, 0, len(accumulator))
	for _, row := range accumulator {
		rekapRows = append(rekapRows, *row)
	}

	sort.SliceStable(rekapRows, func(i, j int) bool {
		leftCode := strings.TrimSpace(rekapRows[i].KodeAkun)
		rightCode := strings.TrimSpace(rekapRows[j].KodeAkun)
		if leftCode == "-" && rightCode != "-" {
			return false
		}
		if leftCode != "-" && rightCode == "-" {
			return true
		}
		if leftCode != rightCode {
			return leftCode < rightCode
		}
		return strings.ToLower(strings.TrimSpace(rekapRows[i].NamaAkun)) < strings.ToLower(strings.TrimSpace(rekapRows[j].NamaAkun))
	})

	return rekapRows, nil
}

func buildHistoriAkunRows(reqProfileID *uint, jurnalRows []JurnalWorkbookRow) ([]HistoriAkunGroup, error) {
	includeAllProfiles := reqProfileID == nil
	coas, err := service.GetAllChartOfAccounts(reqProfileID, includeAllProfiles)
	if err != nil {
		return nil, err
	}

	coaNameByCode := make(map[string]string, len(coas))
	coaSaldoNormalByCode := make(map[string]string, len(coas))
	for _, coa := range coas {
		code := strings.TrimSpace(coa.KodeAkun)
		if code == "" {
			continue
		}
		coaNameByCode[code] = strings.TrimSpace(coa.NamaAkun)
		coaSaldoNormalByCode[code] = strings.TrimSpace(strings.ToLower(coa.SaldoNormal))
	}

	type movement struct {
		timeValue          time.Time
		dateText           string
		unitUsaha          string
		deskripsiTransaksi string
		keterangan         string
		debit              float64
		kredit             float64
	}

	movementByCode := make(map[string][]movement)
	for _, row := range jurnalRows {
		debitCode, debitName := parseJurnalAkunParts(row.AkunDebit)
		if debitCode != "" {
			if _, ok := coaNameByCode[debitCode]; !ok {
				coaNameByCode[debitCode] = debitName
			}
			movementByCode[debitCode] = append(movementByCode[debitCode], movement{
				timeValue:          parseWorkbookDate(row.Tanggal),
				dateText:           row.Tanggal,
				unitUsaha:          row.UnitUsaha,
				deskripsiTransaksi: row.DeskripsiTransaksi,
				keterangan:         row.Keterangan,
				debit:              row.NominalDebit,
				kredit:             0,
			})
		}

		kreditCode, kreditName := parseJurnalAkunParts(row.AkunKredit)
		if kreditCode != "" {
			if _, ok := coaNameByCode[kreditCode]; !ok {
				coaNameByCode[kreditCode] = kreditName
			}
			movementByCode[kreditCode] = append(movementByCode[kreditCode], movement{
				timeValue:          parseWorkbookDate(row.Tanggal),
				dateText:           row.Tanggal,
				unitUsaha:          row.UnitUsaha,
				deskripsiTransaksi: row.DeskripsiTransaksi,
				keterangan:         row.Keterangan,
				debit:              0,
				kredit:             row.NominalKredit,
			})
		}
	}

	codes := make([]string, 0, len(movementByCode))
	for code := range movementByCode {
		codes = append(codes, code)
	}
	sort.Strings(codes)

	result := make([]HistoriAkunGroup, 0, len(codes))
	for _, code := range codes {
		movements := movementByCode[code]
		sort.SliceStable(movements, func(i, j int) bool {
			if !movements[i].timeValue.Equal(movements[j].timeValue) {
				return movements[i].timeValue.Before(movements[j].timeValue)
			}
			if movements[i].deskripsiTransaksi != movements[j].deskripsiTransaksi {
				return movements[i].deskripsiTransaksi < movements[j].deskripsiTransaksi
			}
			if movements[i].keterangan != movements[j].keterangan {
				return movements[i].keterangan < movements[j].keterangan
			}
			if movements[i].unitUsaha != movements[j].unitUsaha {
				return movements[i].unitUsaha < movements[j].unitUsaha
			}
			return movements[i].debit > movements[j].debit
		})

		saldoNormal := coaSaldoNormalByCode[code]
		if saldoNormal == "" {
			saldoNormal = "debit"
		}
		kreditNormal := strings.Contains(saldoNormal, "kredit")

		runningSaldo := 0.0
		rows := make([]HistoriAkunRow, 0, len(movements))
		for _, mv := range movements {
			if kreditNormal {
				runningSaldo += mv.kredit - mv.debit
			} else {
				runningSaldo += mv.debit - mv.kredit
			}

			rows = append(rows, HistoriAkunRow{
				Tanggal:            mv.dateText,
				UnitUsaha:          mv.unitUsaha,
				DeskripsiTransaksi: mv.deskripsiTransaksi,
				Keterangan:         mv.keterangan,
				Debit:              mv.debit,
				Kredit:             mv.kredit,
				Saldo:              runningSaldo,
			})
		}

		saldoLabel := "Debit"
		if kreditNormal {
			saldoLabel = "Kredit"
		}

		result = append(result, HistoriAkunGroup{
			KodeAkun:    code,
			NamaAkun:    coaNameByCode[code],
			SaldoNormal: saldoLabel,
			Rows:        rows,
		})
	}

	return result, nil
}

func parseWorkbookDate(value string) time.Time {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return time.Time{}
	}

	layouts := []string{"2006-01-02", "02/01/2006", "2006-01-02 15:04:05", time.RFC3339}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, cleaned); err == nil {
			return parsed
		}
	}

	return time.Time{}
}

func parseJurnalAkunParts(value string) (string, string) {
	raw := strings.TrimSpace(value)
	if raw == "" || raw == "-" {
		return "", ""
	}

	matcher := regexp.MustCompile(`^([0-9]+(?:-[0-9]+)*)\s*(.*)$`)
	parts := matcher.FindStringSubmatch(raw)
	if len(parts) == 3 {
		code := strings.TrimSpace(parts[1])
		name := strings.TrimSpace(parts[2])
		if name == "" {
			name = raw
		}
		return code, name
	}

	return "", raw
}

func GetKartuPersediaan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reqProfileID, unitUsahaID := resolveWorkbookScope(r)

	transaksis, err := service.GetTransactionsByProfile(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching transaksi", http.StatusInternalServerError)
		return
	}
	transaksis = filterWorkbookTransactionsByUnit(transaksis, unitUsahaID)

	mappings, err := getAllJurnalMappings(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching mapping transaksi", http.StatusInternalServerError)
		return
	}
	mappings = filterWorkbookMappingsByUnit(mappings, unitUsahaID)

	barangs, err := service.GetAllBarang(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching barang", http.StatusInternalServerError)
		return
	}
	barangs = filterWorkbookBarangsByUnit(barangs, unitUsahaID)
	barangSlug := strings.TrimSpace(r.URL.Query().Get("barang_slug"))

	mappingBySlug := make(map[string]models.MappingTransaksi, len(mappings))
	mappingByName := make(map[string][]models.MappingTransaksi, len(mappings))
	for _, mapping := range mappings {
		if slug := strings.TrimSpace(mapping.Slug); slug != "" {
			mappingBySlug[slug] = mapping
		}
		key := normalizeJurnalLookupKey(mapping.NamaMapping)
		if key == "" {
			continue
		}
		mappingByName[key] = append(mappingByName[key], mapping)
	}

	selectedBarangs := make([]models.Barang, 0, len(barangs))
	for _, barang := range barangs {
		if !barang.KartuPersediaan {
			continue
		}
		if barangSlug != "" && barang.Slug != barangSlug {
			continue
		}
		selectedBarangs = append(selectedBarangs, barang)
	}

	sort.SliceStable(selectedBarangs, func(i, j int) bool {
		leftUnit := uint(0)
		if selectedBarangs[i].UnitUsahaID != nil {
			leftUnit = *selectedBarangs[i].UnitUsahaID
		}
		rightUnit := uint(0)
		if selectedBarangs[j].UnitUsahaID != nil {
			rightUnit = *selectedBarangs[j].UnitUsahaID
		}
		if leftUnit != rightUnit {
			return leftUnit < rightUnit
		}
		return strings.ToLower(strings.TrimSpace(selectedBarangs[i].NamaBarang)) < strings.ToLower(strings.TrimSpace(selectedBarangs[j].NamaBarang))
	})

	manualQuery := config.DB.Order("tanggal asc, id asc")
	if reqProfileID != nil {
		manualQuery = manualQuery.Where("profile_bum_des_id = ?", *reqProfileID)
	}
	if unitUsahaID != nil {
		manualQuery = manualQuery.Where("unit_usaha_id = ?", *unitUsahaID)
	}
	if barangSlug != "" {
		manualQuery = manualQuery.Where("barang_slug = ?", barangSlug)
	}

	manualEntries := []models.KartuPersediaanManual{}
	if err := manualQuery.Find(&manualEntries).Error; err != nil {
		http.Error(w, "Error fetching manual kartu persediaan", http.StatusInternalServerError)
		return
	}

	manualByBarang := map[string][]models.KartuPersediaanManual{}
	for _, entry := range manualEntries {
		slug := strings.TrimSpace(entry.BarangSlug)
		if slug == "" {
			continue
		}
		manualByBarang[slug] = append(manualByBarang[slug], entry)
	}

	result := make([]KartuPersediaanGroup, 0, len(selectedBarangs))
	for _, barang := range selectedBarangs {
		group, ok := buildKartuPersediaanGroupForBarang(barang, transaksis, mappingBySlug, mappingByName, manualByBarang[barang.Slug])
		if !ok {
			continue
		}
		result = append(result, group)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func GetBukuPembantuPiutang(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reqProfileID, unitUsahaID := resolveWorkbookScope(r)

	transaksis, err := service.GetTransactionsByProfile(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching transaksi", http.StatusInternalServerError)
		return
	}
	transaksis = filterWorkbookTransactionsByUnit(transaksis, unitUsahaID)

	mappings, err := getAllJurnalMappings(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching mapping transaksi", http.StatusInternalServerError)
		return
	}
	mappings = filterWorkbookMappingsByUnit(mappings, unitUsahaID)

	pelanggans, err := service.GetAllPelanggan(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching pelanggan", http.StatusInternalServerError)
		return
	}
	pelanggans = filterWorkbookPelanggansByUnit(pelanggans, unitUsahaID)
	pelangganSlug := strings.TrimSpace(r.URL.Query().Get("pelanggan_slug"))

	mappingBySlug := make(map[string]models.MappingTransaksi, len(mappings))
	mappingByName := make(map[string]models.MappingTransaksi, len(mappings))
	for _, mapping := range mappings {
		if slug := strings.TrimSpace(mapping.Slug); slug != "" {
			if _, exists := mappingBySlug[slug]; !exists {
				mappingBySlug[slug] = mapping
			}
		}
		key := normalizeJurnalLookupKey(mapping.NamaMapping)
		if key == "" {
			continue
		}
		if _, exists := mappingByName[key]; !exists {
			mappingByName[key] = mapping
		}
	}

	selectedPelanggans := make([]models.Pelanggan, 0, len(pelanggans))
	for _, pelanggan := range pelanggans {
		if !pelanggan.BkPembantuPiutang {
			continue
		}
		if pelangganSlug != "" && pelanggan.Slug != pelangganSlug {
			continue
		}
		selectedPelanggans = append(selectedPelanggans, pelanggan)
	}

	sort.SliceStable(selectedPelanggans, func(i, j int) bool {
		leftUnit := uint(0)
		if selectedPelanggans[i].UnitUsahaID != nil {
			leftUnit = *selectedPelanggans[i].UnitUsahaID
		}
		rightUnit := uint(0)
		if selectedPelanggans[j].UnitUsahaID != nil {
			rightUnit = *selectedPelanggans[j].UnitUsahaID
		}
		if leftUnit != rightUnit {
			return leftUnit < rightUnit
		}
		return strings.ToLower(strings.TrimSpace(selectedPelanggans[i].NamaPelanggan)) < strings.ToLower(strings.TrimSpace(selectedPelanggans[j].NamaPelanggan))
	})

	result := make([]BukuPembantuPiutangGroup, 0, len(selectedPelanggans))
	for _, pelanggan := range selectedPelanggans {
		group, ok := buildBukuPembantuPiutangGroupForPelanggan(pelanggan, transaksis, mappingBySlug, mappingByName)
		if !ok {
			continue
		}
		result = append(result, group)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func GetBukuPembantuUtang(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reqProfileID, unitUsahaID := resolveWorkbookScope(r)

	transaksis, err := service.GetTransactionsByProfile(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching transaksi", http.StatusInternalServerError)
		return
	}
	transaksis = filterWorkbookTransactionsByUnit(transaksis, unitUsahaID)

	mappings, err := getAllJurnalMappings(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching mapping transaksi", http.StatusInternalServerError)
		return
	}
	mappings = filterWorkbookMappingsByUnit(mappings, unitUsahaID)

	suppliers, err := service.GetAllSupplier(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching supplier", http.StatusInternalServerError)
		return
	}
	suppliers = filterWorkbookSuppliersByUnit(suppliers, unitUsahaID)
	supplierSlug := strings.TrimSpace(r.URL.Query().Get("supplier_slug"))

	mappingBySlug := make(map[string]models.MappingTransaksi, len(mappings))
	mappingByName := make(map[string]models.MappingTransaksi, len(mappings))
	for _, mapping := range mappings {
		if slug := strings.TrimSpace(mapping.Slug); slug != "" {
			if _, exists := mappingBySlug[slug]; !exists {
				mappingBySlug[slug] = mapping
			}
		}
		key := normalizeJurnalLookupKey(mapping.NamaMapping)
		if key == "" {
			continue
		}
		if _, exists := mappingByName[key]; !exists {
			mappingByName[key] = mapping
		}
	}

	selectedSuppliers := make([]models.Supplier, 0, len(suppliers))
	for _, supplier := range suppliers {
		if !supplier.BkPembantuUtang {
			continue
		}
		if supplierSlug != "" && supplier.Slug != supplierSlug {
			continue
		}
		selectedSuppliers = append(selectedSuppliers, supplier)
	}

	sort.SliceStable(selectedSuppliers, func(i, j int) bool {
		leftUnit := uint(0)
		if selectedSuppliers[i].UnitUsahaID != nil {
			leftUnit = *selectedSuppliers[i].UnitUsahaID
		}
		rightUnit := uint(0)
		if selectedSuppliers[j].UnitUsahaID != nil {
			rightUnit = *selectedSuppliers[j].UnitUsahaID
		}
		if leftUnit != rightUnit {
			return leftUnit < rightUnit
		}
		return strings.ToLower(strings.TrimSpace(selectedSuppliers[i].NamaSupplier)) < strings.ToLower(strings.TrimSpace(selectedSuppliers[j].NamaSupplier))
	})

	result := make([]BukuPembantuUtangGroup, 0, len(selectedSuppliers))
	for _, supplier := range selectedSuppliers {
		group, ok := buildBukuPembantuUtangGroupForSupplier(supplier, transaksis, mappingBySlug, mappingByName)
		if !ok {
			continue
		}
		result = append(result, group)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func GetKartuAsetTetap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reqProfileID, unitUsahaID := resolveWorkbookScope(r)

	transaksis, err := service.GetTransactionsByProfile(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching transaksi", http.StatusInternalServerError)
		return
	}
	transaksis = filterWorkbookTransactionsByUnit(transaksis, unitUsahaID)

	mappings, err := getAllJurnalMappings(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching mapping transaksi", http.StatusInternalServerError)
		return
	}
	mappings = filterWorkbookMappingsByUnit(mappings, unitUsahaID)

	inventariss, err := service.GetAllInventaris(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching inventaris", http.StatusInternalServerError)
		return
	}

	// Filter by unit usaha jika ada
	if unitUsahaID != nil {
		filtered := make([]models.Inventaris, 0, len(inventariss))
		for _, inv := range inventariss {
			if inv.UnitUsahaID != nil && *inv.UnitUsahaID == *unitUsahaID {
				filtered = append(filtered, inv)
			}
		}
		inventariss = filtered
	}

	asetSlug := strings.TrimSpace(r.URL.Query().Get("aset_slug"))

	mappingBySlug := make(map[string]models.MappingTransaksi, len(mappings))
	mappingByName := make(map[string]models.MappingTransaksi, len(mappings))
	for _, mapping := range mappings {
		if slug := strings.TrimSpace(mapping.Slug); slug != "" {
			if _, exists := mappingBySlug[slug]; !exists {
				mappingBySlug[slug] = mapping
			}
		}
		key := normalizeJurnalLookupKey(mapping.NamaMapping)
		if key == "" {
			continue
		}
		if _, exists := mappingByName[key]; !exists {
			mappingByName[key] = mapping
		}
	}

	selectedAsets := make([]models.Inventaris, 0, len(inventariss))
	for _, inv := range inventariss {
		if !inv.KartuAsetTetap {
			continue
		}
		if asetSlug != "" && inv.Slug != asetSlug {
			continue
		}
		selectedAsets = append(selectedAsets, inv)
	}

	sort.SliceStable(selectedAsets, func(i, j int) bool {
		leftUnit := uint(0)
		if selectedAsets[i].UnitUsahaID != nil {
			leftUnit = *selectedAsets[i].UnitUsahaID
		}
		rightUnit := uint(0)
		if selectedAsets[j].UnitUsahaID != nil {
			rightUnit = *selectedAsets[j].UnitUsahaID
		}
		if leftUnit != rightUnit {
			return leftUnit < rightUnit
		}
		return strings.ToLower(strings.TrimSpace(selectedAsets[i].NamaAset)) < strings.ToLower(strings.TrimSpace(selectedAsets[j].NamaAset))
	})

	result := make([]KartuAsetTetapGroup, 0, len(selectedAsets))
	for _, inv := range selectedAsets {
		group := buildKartuAsetTetapGroupForInventaris(inv, transaksis, mappingBySlug, mappingByName)
		result = append(result, group)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func buildKartuAsetTetapGroupForInventaris(inv models.Inventaris, transaksis []models.Transaksi, mappingBySlug map[string]models.MappingTransaksi, mappingByName map[string]models.MappingTransaksi) KartuAsetTetapGroup {
	unitName := "-"
	if strings.TrimSpace(inv.UnitUsaha.NamaUnitUsaha) != "" {
		unitName = strings.TrimSpace(inv.UnitUsaha.NamaUnitUsaha)
	}
	profileName := "-"
	if strings.TrimSpace(inv.ProfileBUMDes.NamaBUMDes) != "" {
		profileName = strings.TrimSpace(inv.ProfileBUMDes.NamaBUMDes)
	}

	// Harga Perolehan: HargaBeli + OngkosKirim + BiayaInstalasi; jika 0, fallback ke SaldoAwal
	hargaPerolehan := inv.HargaBeli + inv.OngkosKirim + inv.BiayaInstalasi
	if hargaPerolehan <= 0 {
		hargaPerolehan = float64(inv.SaldoAwal) + float64(inv.AkumulasiPenyusutanAwal)
	}

	// Beban penyusutan per bulan = (HargaPerolehan - NilaiResidu) / (UmurEkonomis * 12)
	umurBulan := inv.UmurEkonomis * 12
	var bebanPerBulan float64
	if umurBulan > 0 && hargaPerolehan > float64(inv.NilaiResidu) {
		bebanPerBulan = (hargaPerolehan - float64(inv.NilaiResidu)) / float64(umurBulan)
	}

	// Hitung Beban Penyusutan Periode Berjalan dari transaksi yang terhubung akumulasi penyusutan
	akunAkumKey := strings.ToLower(strings.TrimSpace(inv.LinkAkunAkumulasiPenyusutan))
	akunAsetKey := strings.ToLower(strings.TrimSpace(inv.LinkAkunAsetTetap))
	var bebanPeriodeBerjalan float64
	var linkAkunBeban string

	if inv.UnitUsahaID != nil && *inv.UnitUsahaID != 0 {
		for _, tx := range transaksis {
			if tx.UnitUsahaID != *inv.UnitUsahaID {
				continue
			}
			if !transaksiMatchesAset(tx, inv) {
				continue
			}
			mapping, ok := mappingBySlug[strings.TrimSpace(tx.MappingSlug)]
			if !ok {
				mapping, ok = mappingByName[normalizeJurnalLookupKey(tx.Deskripsi)]
			}
			if !ok {
				continue
			}

			if !mappingHasAsetTetapLink(mapping) {
				continue
			}

			bebanPeriodeBerjalan += tx.Nominal
			if linkAkunBeban == "" {
				linkAkunBeban = strings.TrimSpace(mapping.AkunDebet)
			}
			_ = akunAkumKey
			_ = akunAsetKey
		}
	}

	akumulasiTotal := float64(inv.AkumulasiPenyusutanAwal) + bebanPeriodeBerjalan
	nilaiBuku := hargaPerolehan - akumulasiTotal

	tanggalBeli := "-"
	if inv.TanggalPembelian != nil {
		tanggalBeli = inv.TanggalPembelian.Format("2006-01-02")
	}
	tanggalDigunakan := "-"
	if inv.TanggalDigunakan != nil {
		tanggalDigunakan = inv.TanggalDigunakan.Format("2006-01-02")
	}
	tanggalTidakAktif := "-"
	status := strings.TrimSpace(inv.Status)
	if status != "" && !strings.EqualFold(status, "aktif") && inv.TanggalDigunakan != nil {
		// Gunakan UpdatedAt sebagai proxy jika tidak ada field tanggal tidak aktif
		tanggalTidakAktif = inv.UpdatedAt.Format("2006-01-02")
	}

	group := KartuAsetTetapGroup{
		ProfileBUMDesName:    profileName,
		AsetSlug:             inv.Slug,
		KodeAset:             strings.TrimSpace(inv.KodeAset),
		NamaAset:             strings.TrimSpace(inv.NamaAset),
		MerkAset:             strings.TrimSpace(inv.MerkAset),
		KategoriAset:         strings.TrimSpace(inv.KategoriAset),
		TanggalPembelian:     tanggalBeli,
		TanggalDigunakan:     tanggalDigunakan,
		JumlahUnit:           1,
		HargaSatuan:          inv.HargaBeli,
		HargaPerolehan:       hargaPerolehan,
		NilaiResidu:          float64(inv.NilaiResidu),
		UmurEkonomis:         inv.UmurEkonomis,
		UmurEkonomisBulan:    umurBulan,
		BebanPerBulan:        bebanPerBulan,
		BebanPeriodeBerjalan: bebanPeriodeBerjalan,
		AkumulasiPenyusutan:  akumulasiTotal,
		NilaiBuku:            nilaiBuku,
		Status:               status,
		TanggalTidakAktif:    tanggalTidakAktif,
		LinkAkunAset:         strings.TrimSpace(inv.LinkAkunAsetTetap),
		LinkAkunAkumulasi:    strings.TrimSpace(inv.LinkAkunAkumulasiPenyusutan),
		LinkAkunBeban:        linkAkunBeban,
		Satuan:               strings.TrimSpace(inv.Satuan),
		UnitUsaha:            unitName,
	}
	if inv.UnitUsahaID != nil {
		group.UnitUsahaID = *inv.UnitUsahaID
	}
	return group
}

func transaksiMatchesAset(tx models.Transaksi, inv models.Inventaris) bool {
	target := normalizeInventoryText(inv.NamaAset)
	if target == "" {
		return false
	}
	lookup := normalizeInventoryText(strings.Join([]string{tx.Keterangan, tx.Deskripsi}, " "))
	return strings.Contains(lookup, target)
}

func buildBukuPembantuPiutangGroupForPelanggan(pelanggan models.Pelanggan, transaksis []models.Transaksi, mappingBySlug map[string]models.MappingTransaksi, mappingByName map[string]models.MappingTransaksi) (BukuPembantuPiutangGroup, bool) {
	if pelanggan.UnitUsahaID == nil || *pelanggan.UnitUsahaID == 0 {
		return BukuPembantuPiutangGroup{}, false
	}

	unitName := "-"
	if strings.TrimSpace(pelanggan.UnitUsaha.NamaUnitUsaha) != "" {
		unitName = strings.TrimSpace(pelanggan.UnitUsaha.NamaUnitUsaha)
	}
	profileName := "-"
	if strings.TrimSpace(pelanggan.ProfileBUMDes.NamaBUMDes) != "" {
		profileName = strings.TrimSpace(pelanggan.ProfileBUMDes.NamaBUMDes)
	}

	group := BukuPembantuPiutangGroup{
		ProfileBUMDesName: profileName,
		UnitUsahaID:       *pelanggan.UnitUsahaID,
		UnitUsaha:         unitName,
		PelangganSlug:     pelanggan.Slug,
		PelangganKode:     strings.TrimSpace(pelanggan.KodePelanggan),
		PelangganName:     strings.TrimSpace(pelanggan.NamaPelanggan),
		LinkAkun:          strings.TrimSpace(pelanggan.LinkAkun),
		Rows:              []BukuPembantuPiutangRow{},
	}

	saldoPiutang := float64(pelanggan.SaldoAwal)
	// Saldo Awal selalu ditampilkan (termasuk 0) jika pelanggan aktif BP Piutang
	group.Rows = append(group.Rows, BukuPembantuPiutangRow{
		Tanggal:      "-",
		Deskripsi:    "-",
		Keterangan:   "Saldo Awal",
		RefTransaksi: "-",
		Masuk:        saldoPiutang,
		Keluar:       0,
		SaldoPiutang: saldoPiutang,
		Sumber:       "Saldo Awal",
	})

	filtered := make([]models.Transaksi, 0)
	for _, tx := range transaksis {
		if tx.UnitUsahaID != *pelanggan.UnitUsahaID {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(tx.NamaPelangganPemasok), strings.TrimSpace(pelanggan.NamaPelanggan)) {
			continue
		}
		filtered = append(filtered, tx)
	}

	sort.SliceStable(filtered, func(i, j int) bool {
		if filtered[i].Tanggal.Equal(filtered[j].Tanggal) {
			return filtered[i].ID < filtered[j].ID
		}
		return filtered[i].Tanggal.Before(filtered[j].Tanggal)
	})

	for _, tx := range filtered {
		mapping, ok := mappingBySlug[strings.TrimSpace(tx.MappingSlug)]
		if !ok {
			mapping, ok = mappingByName[normalizeJurnalLookupKey(tx.Deskripsi)]
		}
		if !ok {
			continue
		}

		amount, movement, ok := resolvePiutangMutationEntry(tx, mapping)
		if !ok {
			continue
		}

		row := BukuPembantuPiutangRow{
			Tanggal:      tx.Tanggal.Format("2006-01-02"),
			Deskripsi:    strings.TrimSpace(tx.Deskripsi),
			Keterangan:   firstNonEmpty(tx.Keterangan, tx.Deskripsi, "-"),
			RefTransaksi: fmt.Sprintf("TRX-%06d", tx.ID),
			Masuk:        0,
			Keluar:       0,
			SaldoPiutang: saldoPiutang,
			Sumber:       "Transaksi",
		}

		if movement == "masuk" {
			row.Masuk = amount
			saldoPiutang += amount
		} else {
			row.Keluar = amount
			saldoPiutang -= amount
		}
		row.SaldoPiutang = saldoPiutang
		group.Rows = append(group.Rows, row)
	}

	return group, true
}

func resolvePiutangMutationEntry(tx models.Transaksi, mapping models.MappingTransaksi) (float64, string, bool) {
	if !mapping.LinkBkPiutang {
		hasDetailLink := false
		for _, detail := range mapping.Details {
			if detail.LinkBkPiutang {
				hasDetailLink = true
				break
			}
		}
		if !hasDetailLink {
			return 0, "", false
		}
	}

	details := mapping.Details
	if len(details) == 0 {
		details = []models.MappingTransaksiDetail{{
			AkunDebet:     mapping.AkunDebet,
			AkunKredit:    mapping.AkunKredit,
			LinkBkPiutang: mapping.LinkBkPiutang,
		}}
	}

	for _, detail := range details {
		if mapping.LinkBkPiutang || detail.LinkBkPiutang {
			return tx.Nominal, resolveMovementFromTipeKas(tx.TipeKas), true
		}
	}

	return tx.Nominal, resolveMovementFromTipeKas(tx.TipeKas), true
}

func resolveMovementFromTipeKas(tipeKas string) string {
	if strings.EqualFold(strings.TrimSpace(tipeKas), "tambah") {
		return "masuk"
	}
	return "keluar"
}

func buildBukuPembantuUtangGroupForSupplier(supplier models.Supplier, transaksis []models.Transaksi, mappingBySlug map[string]models.MappingTransaksi, mappingByName map[string]models.MappingTransaksi) (BukuPembantuUtangGroup, bool) {
	if supplier.UnitUsahaID == nil || *supplier.UnitUsahaID == 0 {
		return BukuPembantuUtangGroup{}, false
	}

	unitName := "-"
	if strings.TrimSpace(supplier.UnitUsaha.NamaUnitUsaha) != "" {
		unitName = strings.TrimSpace(supplier.UnitUsaha.NamaUnitUsaha)
	}
	profileName := "-"
	if strings.TrimSpace(supplier.ProfileBUMDes.NamaBUMDes) != "" {
		profileName = strings.TrimSpace(supplier.ProfileBUMDes.NamaBUMDes)
	}

	group := BukuPembantuUtangGroup{
		ProfileBUMDesName: profileName,
		UnitUsahaID:       *supplier.UnitUsahaID,
		UnitUsaha:         unitName,
		SupplierSlug:      supplier.Slug,
		SupplierKode:      strings.TrimSpace(supplier.KodeSupplier),
		SupplierName:      strings.TrimSpace(supplier.NamaSupplier),
		LinkAkun:          strings.TrimSpace(supplier.LinkAkun),
		Rows:              []BukuPembantuUtangRow{},
	}

	saldoUtang := float64(supplier.SaldoAwal)
	// Saldo Awal selalu ditampilkan (termasuk 0) jika supplier aktif BP Utang
	group.Rows = append(group.Rows, BukuPembantuUtangRow{
		Tanggal:      "-",
		Deskripsi:    "-",
		Keterangan:   "Saldo Awal",
		RefTransaksi: "-",
		Masuk:        saldoUtang,
		Keluar:       0,
		SaldoUtang:   saldoUtang,
		Sumber:       "Saldo Awal",
	})

	filtered := make([]models.Transaksi, 0)
	for _, tx := range transaksis {
		if tx.UnitUsahaID != *supplier.UnitUsahaID {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(tx.NamaPelangganPemasok), strings.TrimSpace(supplier.NamaSupplier)) {
			continue
		}
		filtered = append(filtered, tx)
	}

	sort.SliceStable(filtered, func(i, j int) bool {
		if filtered[i].Tanggal.Equal(filtered[j].Tanggal) {
			return filtered[i].ID < filtered[j].ID
		}
		return filtered[i].Tanggal.Before(filtered[j].Tanggal)
	})

	for _, tx := range filtered {
		mapping, ok := mappingBySlug[strings.TrimSpace(tx.MappingSlug)]
		if !ok {
			mapping, ok = mappingByName[normalizeJurnalLookupKey(tx.Deskripsi)]
		}
		if !ok {
			continue
		}

		amount, movement, ok := resolveUtangMutationEntry(tx, mapping, group.LinkAkun)
		if !ok {
			continue
		}

		row := BukuPembantuUtangRow{
			Tanggal:      tx.Tanggal.Format("2006-01-02"),
			Deskripsi:    strings.TrimSpace(tx.Deskripsi),
			Keterangan:   firstNonEmpty(tx.Keterangan, tx.Deskripsi, "-"),
			RefTransaksi: fmt.Sprintf("TRX-%06d", tx.ID),
			Masuk:        0,
			Keluar:       0,
			SaldoUtang:   saldoUtang,
			Sumber:       "Transaksi",
		}

		if movement == "masuk" {
			row.Masuk = amount
			saldoUtang += amount
		} else {
			row.Keluar = amount
			saldoUtang -= amount
		}
		row.SaldoUtang = saldoUtang
		group.Rows = append(group.Rows, row)
	}

	return group, true
}

func resolveUtangMutationEntry(tx models.Transaksi, mapping models.MappingTransaksi, supplierLinkAkun string) (float64, string, bool) {
	if !mapping.LinkBkUtang {
		hasDetailLink := false
		for _, detail := range mapping.Details {
			if detail.LinkBkUtang {
				hasDetailLink = true
				break
			}
		}
		if !hasDetailLink {
			return 0, "", false
		}
	}

	details := mapping.Details
	if len(details) == 0 {
		details = []models.MappingTransaksiDetail{{
			AkunDebet:   mapping.AkunDebet,
			AkunKredit:  mapping.AkunKredit,
			LinkBkUtang: mapping.LinkBkUtang,
		}}
	}

	for _, detail := range details {
		if mapping.LinkBkUtang || detail.LinkBkUtang {
			akunDebet := resolveJurnalAccountValue(strings.TrimSpace(detail.AkunDebet), tx.TipeKas, true)
			akunKredit := resolveJurnalAccountValue(strings.TrimSpace(detail.AkunKredit), tx.TipeKas, false)

			if strings.TrimSpace(tx.AkunDebet) != "" {
				akunDebet = strings.TrimSpace(tx.AkunDebet)
			}
			if strings.TrimSpace(tx.AkunKredit) != "" {
				akunKredit = strings.TrimSpace(tx.AkunKredit)
			}

			// Untuk BP Utang: kewajiban bertambah jika akun utang ada di sisi kredit, berkurang jika ada di sisi debet.
			if accountMatchesLinkAkun(akunKredit, supplierLinkAkun) {
				return tx.Nominal, "masuk", true
			}
			if accountMatchesLinkAkun(akunDebet, supplierLinkAkun) {
				return tx.Nominal, "keluar", true
			}

			// Fallback untuk transaksi kredit (contoh: beli belum dibayar) agar menambah utang.
			if strings.EqualFold(strings.TrimSpace(tx.StatusBayar), "kredit") {
				return tx.Nominal, "masuk", true
			}

			return tx.Nominal, resolveMovementFromTipeKas(tx.TipeKas), true
		}
	}

	if strings.EqualFold(strings.TrimSpace(tx.StatusBayar), "kredit") {
		return tx.Nominal, "masuk", true
	}

	return tx.Nominal, resolveMovementFromTipeKas(tx.TipeKas), true
}

func accountMatchesLinkAkun(accountValue string, linkAkun string) bool {
	accountKey := normalizeJurnalLookupKey(accountValue)
	if accountKey == "" || accountKey == "-" {
		return false
	}

	accountCode, _ := parseJurnalAkunParts(accountValue)
	for _, candidate := range splitLinkedAkunCandidates(linkAkun) {
		candidateCode, _ := parseJurnalAkunParts(candidate)
		if accountCode != "" && candidateCode != "" && strings.EqualFold(accountCode, candidateCode) {
			return true
		}

		candidateKey := normalizeJurnalLookupKey(candidate)
		if candidateKey == "" || candidateKey == "-" {
			continue
		}
		if accountKey == candidateKey || strings.Contains(accountKey, candidateKey) {
			return true
		}
	}

	return false
}

func splitLinkedAkunCandidates(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	parts := strings.FieldsFunc(raw, func(r rune) bool {
		switch r {
		case ',', ';', '|', '\n', '\r':
			return true
		default:
			return false
		}
	})

	if len(parts) == 0 {
		return []string{raw}
	}

	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}

	if len(result) == 0 {
		return []string{raw}
	}

	return result
}

func normalizeJurnalLookupKey(raw string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(raw))), " ")
}

func buildKartuPersediaanGroupForBarang(barang models.Barang, transaksis []models.Transaksi, mappingBySlug map[string]models.MappingTransaksi, mappingByName map[string][]models.MappingTransaksi, manualEntries []models.KartuPersediaanManual) (KartuPersediaanGroup, bool) {
	if barang.UnitUsahaID == nil || *barang.UnitUsahaID == 0 {
		return KartuPersediaanGroup{}, false
	}

	accounts := splitInventoryAccounts(barang.LinkAkun)
	if len(accounts) == 0 {
		return KartuPersediaanGroup{}, false
	}

	unitName := "-"
	if strings.TrimSpace(barang.UnitUsaha.NamaUnitUsaha) != "" {
		unitName = strings.TrimSpace(barang.UnitUsaha.NamaUnitUsaha)
	}
	profileName := "-"
	if strings.TrimSpace(barang.ProfileBUMDes.NamaBUMDes) != "" {
		profileName = strings.TrimSpace(barang.ProfileBUMDes.NamaBUMDes)
	}

	group := KartuPersediaanGroup{
		ProfileBUMDesName: profileName,
		UnitUsahaID:       *barang.UnitUsahaID,
		UnitUsaha:         unitName,
		BarangSlug:        barang.Slug,
		AkunPersediaan:    accounts[0],
		NamaReferensi:     strings.TrimSpace(barang.NamaBarang),
		Satuan:            strings.TrimSpace(barang.Satuan),
		Rows:              []KartuPersediaanRow{},
	}

	saldoQty := barang.SaldoAwalQty
	saldoNominal := float64(barang.SaldoAwalNominal)
	if saldoNominal == 0 && saldoQty > 0 && barang.HargaBeliAwal > 0 {
		saldoNominal = saldoQty * barang.HargaBeliAwal
	}
	if opening := buildKartuPersediaanOpeningRow(barang); opening != nil {
		group.Rows = append(group.Rows, *opening)
	}

	type kartuPersediaanMutation struct {
		Tanggal  time.Time
		SortTime time.Time
		Order    int
		Sumber   string
		Tx       *models.Transaksi
		Movement string
		Qty      float64
		Manual   *models.KartuPersediaanManual
	}

	mutations := make([]kartuPersediaanMutation, 0, len(transaksis)+len(manualEntries))
	order := 0

	for _, tx := range transaksis {
		if tx.UnitUsahaID != *barang.UnitUsahaID {
			continue
		}
		if !transaksiMatchesBarang(tx, barang) {
			continue
		}

		mapping, ok := resolveInventoryMappingForBarangTx(tx, barang, mappingBySlug, mappingByName)
		if !ok {
			continue
		}
		if !mappingHasPersediaanLink(mapping) {
			continue
		}

		details := mapping.Details
		if len(details) == 0 {
			details = []models.MappingTransaksiDetail{{AkunDebet: mapping.AkunDebet, AkunKredit: mapping.AkunKredit}}
		}

		for range details {
			movement := ""
			for _, detail := range details {
				_, resolvedMovement := resolvePersediaanMutation(detail)
				if resolvedMovement != "" {
					movement = resolvedMovement
					break
				}
			}
			if movement == "" {
				movement = resolveMovementFromTipeKas(tx.TipeKas)
			}

			qty := extractInventoryQuantity(firstNonEmpty(tx.Keterangan, tx.Deskripsi))
			copyTx := tx
			mutations = append(mutations, kartuPersediaanMutation{
				Tanggal:  tx.Tanggal,
				SortTime: tx.CreatedAt,
				Order:    order,
				Sumber:   "Transaksi",
				Tx:       &copyTx,
				Movement: movement,
				Qty:      qty,
			})
			order++
			break
		}
	}

	for _, manualEntry := range manualEntries {
		if manualEntry.UnitUsahaID != *barang.UnitUsahaID {
			continue
		}

		copyManual := manualEntry
		movement := "keluar"
		if strings.EqualFold(manualEntry.Jenis, "masuk") {
			movement = "masuk"
		}
		mutations = append(mutations, kartuPersediaanMutation{
			Tanggal:  manualEntry.Tanggal,
			SortTime: manualEntry.CreatedAt,
			Order:    order,
			Sumber:   "Manual",
			Movement: movement,
			Qty:      manualEntry.Qty,
			Manual:   &copyManual,
		})
		order++
	}

	sort.SliceStable(mutations, func(i, j int) bool {
		leftSort := mutations[i].SortTime
		rightSort := mutations[j].SortTime
		if leftSort.IsZero() {
			leftSort = mutations[i].Tanggal
		}
		if rightSort.IsZero() {
			rightSort = mutations[j].Tanggal
		}
		if leftSort.Equal(rightSort) {
			return mutations[i].Order < mutations[j].Order
		}
		return leftSort.Before(rightSort)
	})

	for _, mutation := range mutations {
		if mutation.Sumber == "Manual" && mutation.Manual != nil {
			manualEntry := mutation.Manual
			qty := mutation.Qty
			nominal := qty * manualEntry.Harga

			row := KartuPersediaanRow{
				Tanggal:     mutation.Tanggal.Format("2006-01-02"),
				Deskripsi:   firstNonEmpty(manualEntry.Deskripsi, "Input Manual"),
				Keterangan:  firstNonEmpty(manualEntry.Keterangan, "Mutasi manual", "-"),
				MasukQty:    "-",
				MasukHarga:  "-",
				KeluarQty:   "-",
				KeluarHarga: "-",
				Sumber:      "Manual",
				IsManual:    true,
				ManualID:    manualEntry.ID,
			}

			if mutation.Movement == "masuk" {
				if qty > 0 {
					row.MasukQty = formatKartuPersediaanNumber(qty)
					row.MasukHarga = formatKartuPersediaanNumber(manualEntry.Harga)
				}
				row.MasukNominal = nominal
				saldoQty += qty
				saldoNominal += nominal
			} else {
				if qty > 0 {
					row.KeluarQty = formatKartuPersediaanNumber(qty)
					row.KeluarHarga = formatKartuPersediaanNumber(manualEntry.Harga)
				}
				row.KeluarNominal = nominal
				saldoQty -= qty
				saldoNominal -= nominal
			}

			row.SaldoQty = formatOptionalKartuPersediaanNumber(saldoQty)
			row.SaldoHarga = formatOptionalKartuPersediaanNumber(computeAverageInventoryRate(saldoQty, saldoNominal))
			row.SaldoNominal = saldoNominal
			group.Rows = append(group.Rows, row)
			continue
		}

		if mutation.Tx == nil {
			continue
		}

		tx := mutation.Tx
		qty := mutation.Qty
		prevAvgRate := computeAverageInventoryRate(saldoQty, saldoNominal)

		row := KartuPersediaanRow{
			Tanggal:     mutation.Tanggal.Format("2006-01-02"),
			Deskripsi:   strings.TrimSpace(tx.Deskripsi),
			Keterangan:  firstNonEmpty(tx.Keterangan, tx.Deskripsi, "-"),
			MasukQty:    "-",
			MasukHarga:  "-",
			KeluarQty:   "-",
			KeluarHarga: "-",
			Sumber:      "Transaksi",
		}

		if mutation.Movement == "masuk" {
			masukNominal := tx.Nominal
			row.MasukNominal = masukNominal
			if qty > 0 {
				row.MasukQty = formatKartuPersediaanNumber(qty)
				row.MasukHarga = formatKartuPersediaanNumber(masukNominal / qty)
				saldoQty += qty
			}
			saldoNominal += masukNominal
		} else {
			var keluarNominal float64
			if qty > 0 {
				row.KeluarQty = formatKartuPersediaanNumber(qty)
				if prevAvgRate > 0 {
					keluarNominal = qty * prevAvgRate
					row.KeluarHarga = formatKartuPersediaanNumber(prevAvgRate)
				} else {
					keluarNominal = tx.Nominal
				}
				saldoQty -= qty
			} else {
				keluarNominal = tx.Nominal
			}
			row.KeluarNominal = keluarNominal
			saldoNominal -= keluarNominal
		}

		row.SaldoQty = formatOptionalKartuPersediaanNumber(saldoQty)
		row.SaldoHarga = formatOptionalKartuPersediaanNumber(computeAverageInventoryRate(saldoQty, saldoNominal))
		row.SaldoNominal = saldoNominal
		group.Rows = append(group.Rows, row)
	}

	return group, true
}

func resolveInventoryMappingForBarangTx(tx models.Transaksi, barang models.Barang, mappingBySlug map[string]models.MappingTransaksi, mappingByName map[string][]models.MappingTransaksi) (models.MappingTransaksi, bool) {
	if slug := strings.TrimSpace(tx.MappingSlug); slug != "" {
		if mapping, ok := mappingBySlug[slug]; ok {
			return mapping, true
		}
	}

	candidates := mappingByName[normalizeJurnalLookupKey(tx.Deskripsi)]
	if len(candidates) == 0 {
		return models.MappingTransaksi{}, false
	}
	return candidates[0], true
}

func mappingHasPersediaanLink(mapping models.MappingTransaksi) bool {
	if mapping.LinkPersediaan {
		return true
	}
	for _, detail := range mapping.Details {
		if detail.LinkPersediaan {
			return true
		}
	}
	return false
}

func mappingHasAsetTetapLink(mapping models.MappingTransaksi) bool {
	if mapping.LinkAsetTetap {
		return true
	}
	for _, detail := range mapping.Details {
		if detail.LinkAsetTetap {
			return true
		}
	}
	return false
}

func mappingHasJurnalPenyesuaianLink(mapping models.MappingTransaksi) bool {
	if mapping.LinkJurnalPenyesuaian {
		return true
	}
	for _, detail := range mapping.Details {
		if detail.LinkJurnalPenyesuaian {
			return true
		}
	}
	return false
}

func mappingSupportsBarangInventory(tx models.Transaksi, barang models.Barang, mapping models.MappingTransaksi) bool {
	details := mapping.Details
	if len(details) == 0 {
		details = []models.MappingTransaksiDetail{{AkunDebet: mapping.AkunDebet, AkunKredit: mapping.AkunKredit, LinkPersediaan: mapping.LinkPersediaan}}
	}

	txDebitKey := normalizeJurnalLookupKey(tx.AkunDebet)
	txKreditKey := normalizeJurnalLookupKey(tx.AkunKredit)
	matchedInventoryDetail := false
	for _, detail := range details {
		akunPersediaan, movement := resolvePersediaanMutation(detail)
		if akunPersediaan == "" || movement == "" || !barangUsesInventoryAccount(barang, akunPersediaan) {
			continue
		}
		if !detail.LinkPersediaan && !mapping.LinkPersediaan {
			continue
		}
		matchedInventoryDetail = true
		if normalizeJurnalLookupKey(detail.AkunDebet) == txDebitKey && normalizeJurnalLookupKey(detail.AkunKredit) == txKreditKey {
			return true
		}
	}

	return matchedInventoryDetail
}

func chooseInventoryMappingForBarangTx(tx models.Transaksi, barang models.Barang, candidates []models.MappingTransaksi) (models.MappingTransaksi, bool) {
	if len(candidates) == 0 {
		return models.MappingTransaksi{}, false
	}

	bestIndex := -1
	bestScore := -1
	txDebitKey := normalizeJurnalLookupKey(tx.AkunDebet)
	txKreditKey := normalizeJurnalLookupKey(tx.AkunKredit)

	for index, candidate := range candidates {
		details := candidate.Details
		if len(details) == 0 {
			details = []models.MappingTransaksiDetail{{AkunDebet: candidate.AkunDebet, AkunKredit: candidate.AkunKredit, LinkPersediaan: candidate.LinkPersediaan}}
		}

		supportsInventory := false
		score := 0
		for _, detail := range details {
			akunPersediaan, _ := resolvePersediaanMutation(detail)
			if akunPersediaan == "" || !barangUsesInventoryAccount(barang, akunPersediaan) {
				continue
			}
			supportsInventory = true
			score += 2
			if detail.LinkPersediaan {
				score += 4
			}
			if normalizeJurnalLookupKey(detail.AkunDebet) == txDebitKey && normalizeJurnalLookupKey(detail.AkunKredit) == txKreditKey {
				score += 6
			}
		}

		if !supportsInventory {
			continue
		}
		if candidate.LinkPersediaan {
			score += 3
		}

		if score > bestScore {
			bestScore = score
			bestIndex = index
		}
	}

	if bestIndex == -1 {
		return models.MappingTransaksi{}, false
	}

	return candidates[bestIndex], true
}

func splitInventoryAccounts(linkAkun string) []string {
	parts := strings.Split(linkAkun, ";")
	accounts := []string{}
	seen := map[string]struct{}{}
	for _, part := range parts {
		akun := strings.TrimSpace(part)
		if akun == "" || !strings.Contains(strings.ToLower(akun), "persediaan") {
			continue
		}
		if _, exists := seen[akun]; exists {
			continue
		}
		seen[akun] = struct{}{}
		accounts = append(accounts, akun)
	}
	return accounts
}

func buildKartuPersediaanGroupKey(unitUsahaID uint, akun string) string {
	return fmt.Sprintf("%d|%s", unitUsahaID, strings.TrimSpace(akun))
}

func buildKartuPersediaanOpeningRow(barang models.Barang) *KartuPersediaanRow {
	saldoQty := barang.SaldoAwalQty
	saldoNominal := float64(barang.SaldoAwalNominal)
	// Jika nominal saldo awal belum diisi, gunakan harga beli × qty sebagai acuan
	if saldoNominal == 0 && saldoQty > 0 && barang.HargaBeliAwal > 0 {
		saldoNominal = saldoQty * barang.HargaBeliAwal
	}
	saldoHarga := computeAverageInventoryRate(saldoQty, saldoNominal)
	if saldoHarga == 0 && barang.HargaBeliAwal > 0 {
		saldoHarga = barang.HargaBeliAwal
	}
	return &KartuPersediaanRow{
		Tanggal:      "-",
		Deskripsi:    "-",
		Keterangan:   "Saldo Awal",
		MasukQty:     "-",
		MasukHarga:   "-",
		KeluarQty:    "-",
		KeluarHarga:  "-",
		SaldoQty:     formatOptionalKartuPersediaanNumber(saldoQty),
		SaldoHarga:   formatOptionalKartuPersediaanNumber(saldoHarga),
		SaldoNominal: saldoNominal,
		Sumber:       "Saldo Awal",
	}
}

func barangUsesInventoryAccount(barang models.Barang, akun string) bool {
	for _, item := range splitInventoryAccounts(barang.LinkAkun) {
		if strings.EqualFold(strings.TrimSpace(item), strings.TrimSpace(akun)) {
			return true
		}
	}
	return false
}

func transaksiMatchesBarang(tx models.Transaksi, barang models.Barang) bool {
	target := normalizeInventoryText(barang.NamaBarang)
	if target == "" {
		return false
	}
	lookup := normalizeInventoryText(strings.Join([]string{tx.Keterangan, tx.Deskripsi}, " "))
	return strings.Contains(lookup, target)
}

func normalizeInventoryText(value string) string {
	cleaned := strings.ToLower(strings.TrimSpace(value))
	if cleaned == "" {
		return ""
	}
	replacer := strings.NewReplacer("/", " ", "-", " ", "_", " ", ",", " ", ".", " ", ":", " ", ";", " ")
	cleaned = replacer.Replace(cleaned)
	return strings.Join(strings.Fields(cleaned), " ")
}

func extractInventoryQuantity(text string) float64 {
	cleaned := strings.ToLower(strings.TrimSpace(text))
	if cleaned == "" {
		return 0
	}
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`(\d+(?:[.,]\d+)?)\s*(?:kg|kilogram|gram|gr|g|pcs|buah|unit|item|ekor|liter|ltr|pack|pak|sak|karung)\b`),
		regexp.MustCompile(`@\s*(?:rp\s*)?[\d.,]+\s*(?:x|×)?\s*(\d+(?:[.,]\d+)?)`),
	}
	for _, pattern := range patterns {
		match := pattern.FindStringSubmatch(cleaned)
		if len(match) < 2 {
			continue
		}
		qty := parseIndonesianNumber(match[1])
		if qty > 0 {
			return qty
		}
	}
	return 0
}

func computeAverageInventoryRate(qty float64, nominal float64) float64 {
	if qty <= 0 || nominal <= 0 {
		return 0
	}
	return nominal / qty
}

func formatOptionalKartuPersediaanNumber(value float64) string {
	// Tampilkan nilai aktual; kembalikan "-" hanya jika benar-benar tidak terdefinisi (NaN/Inf)
	if value != value { // NaN check
		return "-"
	}
	return formatKartuPersediaanNumber(value)
}

func resolvePersediaanMutation(detail models.MappingTransaksiDetail) (string, string) {
	debit := strings.TrimSpace(detail.AkunDebet)
	kredit := strings.TrimSpace(detail.AkunKredit)
	if strings.Contains(strings.ToLower(debit), "persediaan") {
		return debit, "masuk"
	}
	if strings.Contains(strings.ToLower(kredit), "persediaan") {
		return kredit, "keluar"
	}
	return "", ""
}

func formatKartuPersediaanNumber(value float64) string {
	// Format dengan pemisah ribuan dan 2 desimal, hapus trailing zeros
	// Contoh: 5081.97 → "5,081.97", 10000 → "10,000"
	intPart := int64(value)
	fracPart := value - float64(intPart)

	// Format integer part dengan pemisah ribuan
	intStr := fmt.Sprintf("%d", intPart)
	if intPart < 0 {
		intStr = intStr[1:]
	}
	result := ""
	for i, c := range intStr {
		if i > 0 && (len(intStr)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	if intPart < 0 {
		result = "-" + result
	}

	// Tambah desimal jika perlu
	if fracPart != 0 {
		fracStr := fmt.Sprintf("%.2f", fracPart)[1:] // ambil ".XX"
		fracStr = strings.TrimRight(fracStr, "0")
		result += fracStr
	}
	return result
}

func resolveJurnalAccountValue(value string, tipeKas string, isDebit bool) string {
	if value != "" && value != "-" {
		return value
	}
	if isDebit {
		if tipeKas == "tambah" {
			return "Kas"
		}
		return "Beban Operasional"
	}
	if tipeKas == "tambah" {
		return "Pendapatan"
	}
	return "Kas"
}

func buildJurnalWorkbookDetails(tx models.Transaksi, selectedAccounts *models.MappingTransaksi, selectedDescription *models.MappingTransaksi) []jurnalWorkbookDetail {
	details := []jurnalWorkbookDetail{}
	primary := selectedAccounts
	if primary == nil {
		primary = selectedDescription
	}

	if primary != nil && len(primary.Details) > 0 {
		for _, detail := range primary.Details {
			details = append(details, jurnalWorkbookDetail{
				AkunDebet:             fallback(detail.AkunDebet, primary.AkunDebet),
				AkunKredit:            fallback(detail.AkunKredit, primary.AkunKredit),
				LinkAsetTetap:         primary.LinkAsetTetap,
				LinkPersediaan:        primary.LinkPersediaan,
				LinkBkUtang:           primary.LinkBkUtang,
				LinkBkPiutang:         primary.LinkBkPiutang,
				LinkJurnalPenyesuaian: primary.LinkJurnalPenyesuaian,
			})
		}
	} else {
		detail := jurnalWorkbookDetail{AkunDebet: "-", AkunKredit: "-"}
		if primary != nil {
			detail.AkunDebet = fallback(primary.AkunDebet, detail.AkunDebet)
			detail.AkunKredit = fallback(primary.AkunKredit, detail.AkunKredit)
			detail.LinkAsetTetap = primary.LinkAsetTetap
			detail.LinkPersediaan = primary.LinkPersediaan
			detail.LinkBkUtang = primary.LinkBkUtang
			detail.LinkBkPiutang = primary.LinkBkPiutang
			detail.LinkJurnalPenyesuaian = primary.LinkJurnalPenyesuaian
		}
		details = append(details, detail)
	}

	if len(details) > 0 {
		if strings.TrimSpace(tx.AkunDebet) != "" {
			details[0].AkunDebet = strings.TrimSpace(tx.AkunDebet)
		}
		if strings.TrimSpace(tx.AkunKredit) != "" {
			details[0].AkunKredit = strings.TrimSpace(tx.AkunKredit)
		}
	}

	for i := range details {
		if strings.TrimSpace(details[i].AkunDebet) == "" || details[i].AkunDebet == "-" {
			if tx.TipeKas == "tambah" {
				details[i].AkunDebet = "Kas"
			} else {
				details[i].AkunDebet = "Beban Operasional"
			}
		}
		if strings.TrimSpace(details[i].AkunKredit) == "" || details[i].AkunKredit == "-" {
			if tx.TipeKas == "tambah" {
				details[i].AkunKredit = "Pendapatan"
			} else {
				details[i].AkunKredit = "Kas"
			}
		}
	}

	return details
}

func getAllJurnalMappings(profileID *uint) ([]models.MappingTransaksi, error) {
	jenisMappings := []string{"harian", "non_rutin", "umum", "jurnal"}
	all := make([]models.MappingTransaksi, 0)
	for _, jenis := range jenisMappings {
		items, err := service.GetAllMappingTransaksi(profileID, jenis)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func jurnalSourceMappingLabel(selectedAccounts *models.MappingTransaksi, selectedDescription *models.MappingTransaksi) string {
	primary := selectedAccounts
	if primary == nil {
		primary = selectedDescription
	}
	if primary == nil {
		return "-"
	}
	switch strings.ToLower(strings.TrimSpace(primary.JenisMapping)) {
	case "non_rutin":
		return "Non Rutin"
	case "umum":
		return "Lainnya"
	case "jurnal":
		return "Jurnal"
	default:
		return "Rutin"
	}
}

func chooseBestJurnalMapping(ctx jurnalMappingPromptContext, mappings []models.MappingTransaksi, geminiKey string, aiBudget *jurnalGeminiBudget) *models.MappingTransaksi {
	if len(mappings) == 0 || strings.TrimSpace(ctx.SourceText) == "" {
		return nil
	}

	ranked := rankJurnalMappings(ctx, mappings)
	if len(ranked) == 0 {
		return nil
	}

	shortlist := ranked
	if len(shortlist) > 24 {
		shortlist = shortlist[:24]
	}

	if shouldUseGeminiForJurnalMatch(shortlist, geminiKey, aiBudget) {
		aiBudget.remaining--
		idx := geminiPickJurnalMappingIndex(ctx, shortlist, geminiKey)
		if idx >= 0 && idx < len(shortlist) {
			selected := shortlist[idx].mapping
			return &selected
		}
	}

	if shortlist[0].score <= 0 {
		return nil
	}

	selected := shortlist[0].mapping
	return &selected
}

func shouldUseGeminiForJurnalMatch(shortlist []scoredJurnalMapping, geminiKey string, aiBudget *jurnalGeminiBudget) bool {
	if strings.TrimSpace(geminiKey) == "" || aiBudget == nil || aiBudget.remaining <= 0 || len(shortlist) == 0 {
		return false
	}

	top := shortlist[0].score
	if top <= 0 {
		return false
	}

	if len(shortlist) == 1 {
		return top < 16
	}

	second := shortlist[1].score
	gap := top - second

	if top >= 16 && gap >= 3 {
		return false
	}

	return top < 16 || gap <= 2
}

func rankJurnalMappings(ctx jurnalMappingPromptContext, mappings []models.MappingTransaksi) []scoredJurnalMapping {
	ranked := make([]scoredJurnalMapping, 0, len(mappings))
	for _, mapping := range mappings {
		ranked = append(ranked, scoredJurnalMapping{
			mapping: mapping,
			score:   jurnalMappingScore(ctx, mapping),
		})
	}

	sort.SliceStable(ranked, func(i, j int) bool {
		if ranked[i].score != ranked[j].score {
			return ranked[i].score > ranked[j].score
		}
		return strings.ToLower(ranked[i].mapping.NamaMapping) < strings.ToLower(ranked[j].mapping.NamaMapping)
	})

	return ranked
}

func jurnalMappingScore(ctx jurnalMappingPromptContext, mapping models.MappingTransaksi) int {
	source := strings.TrimSpace(ctx.SourceText)
	if source == "" {
		return -1000
	}

	sourceKey := normalizeJurnalText(source)
	namaKey := normalizeJurnalText(mapping.NamaMapping)
	ketKey := normalizeJurnalText(mapping.Keterangan)
	score := 0

	if sourceKey != "" && sourceKey == namaKey {
		score += 18
	}
	if sourceKey != "" && sourceKey == ketKey {
		score += 20
	}

	if ctx.SourceLabel == "keterangan" {
		score += overlapScore(source, mapping.Keterangan) * 5
		score += overlapScore(source, mapping.NamaMapping) * 3
	} else {
		score += overlapScore(source, mapping.NamaMapping) * 5
		score += overlapScore(source, mapping.Keterangan) * 2
	}

	if ctx.TxKeterangan != "" {
		score += overlapScore(ctx.TxKeterangan, mapping.Keterangan)
	}
	if ctx.TxDeskripsi != "" {
		score += overlapScore(ctx.TxDeskripsi, mapping.NamaMapping) * 2
	}

	if mapping.ProfileBUMDesID != nil {
		if *mapping.ProfileBUMDesID == ctx.ProfileBUMDesID {
			score += 5
		} else {
			score -= 5
		}
	}
	if mapping.UnitUsahaID != nil {
		if *mapping.UnitUsahaID == ctx.UnitUsahaID {
			score += 7
		} else {
			score -= 7
		}
	}

	if strings.EqualFold(strings.TrimSpace(mapping.KategoriTransaksi), strings.TrimSpace(ctx.TipeKasToKategori())) {
		score += 3
	}

	tipeDefault := strings.ToLower(strings.TrimSpace(mapping.TipeDefault))
	statusBayar := strings.ToLower(strings.TrimSpace(ctx.StatusBayar))
	if tipeDefault == "semua" {
		score += 1
	} else if tipeDefault != "" && tipeDefault == statusBayar {
		score += 3
	}

	return score
}

func (ctx jurnalMappingPromptContext) TipeKasToKategori() string {
	if strings.EqualFold(strings.TrimSpace(ctx.TipeKas), "tambah") {
		return "masuk"
	}
	if strings.EqualFold(strings.TrimSpace(ctx.TipeKas), "kurang") {
		return "keluar"
	}
	return ""
}

func geminiPickJurnalMappingIndex(ctx jurnalMappingPromptContext, ranked []scoredJurnalMapping, apiKey string) int {
	if len(ranked) == 0 {
		return -1
	}

	var lines []string
	for i, item := range ranked {
		mapping := item.mapping
		lines = append(lines, fmt.Sprintf("%d. nama_mapping=%s | keterangan=%s | akun_debet=%s | akun_kredit=%s | unit_usaha=%s | profile=%s",
			i+1,
			fallback(mapping.NamaMapping, "-"),
			fallback(mapping.Keterangan, "-"),
			fallback(mapping.AkunDebet, "-"),
			fallback(mapping.AkunKredit, "-"),
			jurnalMappingUnitName(mapping),
			jurnalMappingProfileName(mapping),
		))
	}

	prompt := fmt.Sprintf(`Respons HANYA dengan JSON VALID: {"index":0}

Tugas:
- Pilih 1 mapping transaksi paling cocok untuk tujuan "%s".
- Jika tujuan adalah "keterangan", cocokkan sumber transaksi menjadi deskripsi jurnal terbaik.
- Jika tujuan adalah "deskripsi", cocokkan sumber transaksi menjadi akun debit/kredit terbaik.
- Utamakan kecocokan profile BUMDes dan unit usaha yang sama.
- Jika tidak ada kandidat yang masuk akal, jawab {"index":0}.

Konteks transaksi:
- Profile BUMDes: %s
- Unit Usaha: %s
- Keterangan transaksi: %s
- Deskripsi transaksi: %s
- Tipe kas: %s
- Status bayar: %s
- Sumber utama (%s): %s

Daftar kandidat mapping:
%s`,
		ctx.SourceLabel,
		fallback(ctx.ProfileName, "-"),
		fallback(ctx.UnitName, "-"),
		fallback(ctx.TxKeterangan, "-"),
		fallback(ctx.TxDeskripsi, "-"),
		fallback(ctx.TipeKas, "-"),
		fallback(ctx.StatusBayar, "-"),
		ctx.SourceLabel,
		fallback(ctx.SourceText, "-"),
		strings.Join(lines, "\n"),
	)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]interface{}{
			"temperature":      0.1,
			"maxOutputTokens":  32,
			"responseMimeType": "application/json",
		},
	}
	body, _ := json.Marshal(payload)

	modelsToTry := listGeminiGenerateModels(apiKey)
	if len(modelsToTry) == 0 {
		modelsToTry = []string{"models/gemini-2.5-flash", "models/gemini-2.0-flash", "models/gemini-1.5-flash"}
	}

	httpClient := &http.Client{Timeout: jurnalGeminiHTTPTimeout}
	var out map[string]interface{}
	for _, modelName := range modelsToTry {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/%s:generateContent?key=%s", strings.TrimPrefix(modelName, "/"), apiKey)
		req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(body))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := httpClient.Do(req)
		if err != nil {
			continue
		}

		func() {
			defer resp.Body.Close()
			if resp.StatusCode >= 300 {
				return
			}
			if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
				out = nil
			}
		}()

		if out != nil {
			break
		}
	}

	if out == nil {
		return -1
	}

	text := extractGeminiText(out)
	if text == "" {
		return -1
	}

	return parseJurnalMappingChoiceIndex(text, len(ranked))
}

func parseJurnalMappingChoiceIndex(text string, max int) int {
	cleaned := strings.TrimSpace(text)
	if cleaned == "" {
		return -1
	}

	var choice jurnalMappingChoice
	if err := json.Unmarshal([]byte(cleaned), &choice); err == nil {
		if choice.Index <= 0 || choice.Index > max {
			return -1
		}
		return choice.Index - 1
	}

	re := regexp.MustCompile(`\d+`)
	match := re.FindString(cleaned)
	if match == "" {
		return -1
	}

	var idx int
	if _, err := fmt.Sscanf(match, "%d", &idx); err != nil {
		return -1
	}
	if idx <= 0 || idx > max {
		return -1
	}
	return idx - 1
}

func buildJurnalMappingCacheKey(ctx jurnalMappingPromptContext) string {
	return strings.ToLower(strings.Join([]string{
		ctx.SourceLabel,
		fmt.Sprintf("%d", ctx.ProfileBUMDesID),
		fmt.Sprintf("%d", ctx.UnitUsahaID),
		normalizeJurnalText(ctx.SourceText),
		normalizeJurnalText(ctx.TxKeterangan),
		normalizeJurnalText(ctx.TxDeskripsi),
	}, "|"))
}

func normalizeJurnalText(value string) string {
	re := regexp.MustCompile(`[^a-z0-9]+`)
	return strings.Trim(re.ReplaceAllString(strings.ToLower(strings.TrimSpace(value)), " "), " ")
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func jurnalMappingUnitName(mapping models.MappingTransaksi) string {
	if mapping.UnitUsaha != nil {
		return fallback(mapping.UnitUsaha.NamaUnitUsaha, "-")
	}
	return "Semua Unit"
}

func jurnalMappingProfileName(mapping models.MappingTransaksi) string {
	if mapping.ProfileBUMDes != nil {
		return fallback(mapping.ProfileBUMDes.NamaBUMDes, "-")
	}
	return "Semua Profile"
}

func extractGeminiText(resp map[string]interface{}) string {
	candidates, ok := resp["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		return ""
	}

	for _, candidateRaw := range candidates {
		candidate, ok := candidateRaw.(map[string]interface{})
		if !ok {
			continue
		}
		content, ok := candidate["content"].(map[string]interface{})
		if !ok {
			continue
		}
		parts, ok := content["parts"].([]interface{})
		if !ok || len(parts) == 0 {
			continue
		}

		var builder strings.Builder
		for _, partRaw := range parts {
			part, ok := partRaw.(map[string]interface{})
			if !ok {
				continue
			}
			text, _ := part["text"].(string)
			if strings.TrimSpace(text) == "" {
				continue
			}
			if builder.Len() > 0 {
				builder.WriteString("\n")
			}
			builder.WriteString(text)
		}

		combined := strings.TrimSpace(builder.String())
		if combined != "" {
			return combined
		}
	}

	return ""
}

func overlapScore(a, b string) int {
	left := tokenSet(a)
	right := tokenSet(b)
	score := 0
	for token := range left {
		if _, ok := right[token]; ok {
			score++
		}
	}
	return score
}

func tokenSet(s string) map[string]struct{} {
	re := regexp.MustCompile(`[a-zA-Z0-9]+`)
	tokens := re.FindAllString(strings.ToLower(s), -1)
	set := map[string]struct{}{}
	for _, token := range tokens {
		if len(token) > 1 {
			set[token] = struct{}{}
		}
	}
	return set
}

func fallback(v, d string) string {
	if strings.TrimSpace(v) == "" {
		return d
	}
	return strings.TrimSpace(v)
}
