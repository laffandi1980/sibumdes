package handler

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/service"
	"strings"
	"time"
)

type TransaksiItemPayload struct {
	Tanggal              string  `json:"tanggal"`
	NamaPelangganPemasok string  `json:"nama_pelanggan_pemasok"`
	Alamat               string  `json:"alamat"`
	NoTelepon            string  `json:"no_telepon"`
	Keterangan           string  `json:"keterangan"`
	Deskripsi            string  `json:"deskripsi"`
	MappingSlug          string  `json:"mapping_slug"`
	MappingJenis         string  `json:"mapping_jenis"`
	AkunDebet            string  `json:"akun_debet"`
	AkunKredit           string  `json:"akun_kredit"`
	Validasi             string  `json:"validasi"`
	Nominal              float64 `json:"nominal"`
	TipeKas              string  `json:"tipe_kas"`
	StatusBayar          string  `json:"status_bayar"`
	PartnerType          string  `json:"partner_type"`
}

type TransaksiPayload struct {
	SessionSlug string                 `json:"session_slug"`
	UnitUsahaID uint                   `json:"unit_usaha_id"`
	Items       []TransaksiItemPayload `json:"items"`
}

type mappingUnitReference struct {
	AllowAny bool
	UnitIDs  map[uint]struct{}
}

type transaksiMappingReferences struct {
	BySlug map[string]*mappingUnitReference
	ByName map[string]*mappingUnitReference
}

type inventoryStockCandidate struct {
	Barang   models.Barang
	Movement string
	Score    int
}

type inventoryStockValidator struct {
	Barangs       []models.Barang
	MappingBySlug map[string]models.MappingTransaksi
	MappingByName map[string][]models.MappingTransaksi
	RunningStock  map[string]float64
}

type transaksiAutoInventarisCandidate struct {
	Transaksi models.Transaksi
	Mapping   models.MappingTransaksi
}

func normalizeMappingNameKey(raw string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(raw))), " ")
}

func isCrossUnitMappingReference(m models.MappingTransaksi) bool {
	if m.UnitUsahaID == nil || *m.UnitUsahaID == 0 {
		return true
	}

	unitName := strings.ToLower(strings.TrimSpace(m.UnitUsaha.NamaUnitUsaha))
	if strings.Contains(unitName, "bumdes") && strings.Contains(unitName, "umum") {
		return true
	}

	return false
}

func normalizeTransaksiValidasiStatus(raw string, fallback string) string {
	value := strings.TrimSpace(raw)
	if strings.EqualFold(value, "sudah") {
		return "Sudah"
	}
	if strings.EqualFold(value, "belum") {
		return "Belum"
	}
	if strings.EqualFold(strings.TrimSpace(fallback), "sudah") {
		return "Sudah"
	}
	return "Belum"
}

func normalizeTransaksiStatusBayar(raw string, keterangan string) string {
	statusBayar := strings.ToLower(strings.TrimSpace(raw))
	if statusBayar == "tunai" || statusBayar == "kredit" {
		return statusBayar
	}

	ket := strings.ToLower(keterangan)
	kreditKeywords := []string{"kredit", "hutang", "utang", "bon", "tempo", "cicil", "nyicil", "angsuran", "pinjam", "bayar nanti"}
	for _, kw := range kreditKeywords {
		if strings.Contains(ket, kw) {
			return "kredit"
		}
	}

	return "tunai"
}

func isValidasiSudah(value string) bool {
	return strings.EqualFold(strings.TrimSpace(value), "sudah")
}

func transaksiContainsBeliKeyword(keterangan string, deskripsi string) bool {
	combined := strings.ToLower(strings.TrimSpace(strings.Join([]string{keterangan, deskripsi}, " ")))
	return strings.Contains(combined, "beli")
}

func inferInventarisKategoriAset(akun string) string {
	normalized := strings.ToLower(strings.TrimSpace(akun))
	switch {
	case strings.Contains(normalized, "bangunan"):
		return "Bangunan"
	case strings.Contains(normalized, "kendaraan"):
		return "Kendaraan"
	case strings.Contains(normalized, "tanah"):
		return "Tanah"
	case strings.Contains(normalized, "inventaris") || strings.Contains(normalized, "meubel"):
		return "Inventaris Kantor"
	default:
		return "Peralatan"
	}
}

func resolveAsetTetapAkunDebit(tx models.Transaksi, mapping models.MappingTransaksi) string {
	for _, detail := range mapping.Details {
		if !detail.LinkAsetTetap {
			continue
		}
		if strings.TrimSpace(detail.AkunDebet) != "" {
			return strings.TrimSpace(detail.AkunDebet)
		}
	}

	if strings.TrimSpace(tx.AkunDebet) != "" {
		return strings.TrimSpace(tx.AkunDebet)
	}
	if strings.TrimSpace(mapping.AkunDebet) != "" {
		return strings.TrimSpace(mapping.AkunDebet)
	}
	return ""
}

func buildInventarisNamaAset(tx models.Transaksi) string {
	candidates := []string{tx.Keterangan, tx.Deskripsi}
	for _, raw := range candidates {
		name := strings.TrimSpace(raw)
		if name == "" {
			continue
		}
		lowerName := strings.ToLower(name)
		if strings.HasPrefix(lowerName, "beli ") {
			trimmed := strings.TrimSpace(name[5:])
			if trimmed != "" {
				return trimmed
			}
		}
		return name
	}
	return "Pembelian Aset"
}

func createInventarisFromCandidates(profileID *uint, unitUsahaID uint, candidates []transaksiAutoInventarisCandidate) (int, int, error) {
	if len(candidates) == 0 {
		return 0, 0, nil
	}

	created := 0
	skippedDuplicate := 0
	for _, candidate := range candidates {
		tx := candidate.Transaksi
		if !isValidasiSudah(tx.Validasi) {
			continue
		}

		akunAsetTetap := resolveAsetTetapAkunDebit(tx, candidate.Mapping)
		kategoriAset := inferInventarisKategoriAset(akunAsetTetap)
		namaAset := buildInventarisNamaAset(tx)
		hargaBeli := tx.Nominal
		if hargaBeli < 0 {
			hargaBeli = -hargaBeli
		}

		query := config.DB.Model(&models.Inventaris{}).
			Where("unit_usaha_id = ?", unitUsahaID).
			Where("LOWER(TRIM(nama_aset)) = LOWER(TRIM(?))", namaAset).
			Where("DATE(tanggal_pembelian) = ?", tx.Tanggal.Format("2006-01-02")).
			Where("ABS(harga_beli - ?) < ?", hargaBeli, 0.005)
		if profileID != nil {
			query = query.Where("profile_bum_des_id = ?", *profileID)
		}

		var existingCount int64
		if err := query.Count(&existingCount).Error; err != nil {
			return created, skippedDuplicate, err
		}
		if existingCount > 0 {
			skippedDuplicate++
			continue
		}

		inventaris := &models.Inventaris{
			ProfileBUMDesID:  profileID,
			UnitUsahaID:      &unitUsahaID,
			NamaAset:         namaAset,
			HargaBeli:        hargaBeli,
			SaldoAwal:        int64(math.Round(hargaBeli)),
			TanggalPembelian: &tx.Tanggal,
			TanggalDigunakan: &tx.Tanggal,
			KategoriAset:     kategoriAset,
			Status:           "Aktif",
			KartuAsetTetap:   true,
			Satuan:           "Unit",
		}
		if akunAsetTetap != "" {
			inventaris.LinkAkunAsetTetap = akunAsetTetap
		}

		if err := service.SaveInventaris(inventaris); err != nil {
			return created, skippedDuplicate, err
		}
		created++
	}

	return created, skippedDuplicate, nil
}

func loadTransaksiMappingReferences(profileID *uint) (*transaksiMappingReferences, error) {
	kinds := []string{"harian", "non_rutin", "umum", "jurnal"}
	refs := &transaksiMappingReferences{
		BySlug: make(map[string]*mappingUnitReference),
		ByName: make(map[string]*mappingUnitReference),
	}

	for _, kind := range kinds {
		mappings, err := service.GetAllMappingTransaksi(profileID, kind)
		if err != nil {
			return nil, err
		}

		for _, m := range mappings {
			ref := &mappingUnitReference{UnitIDs: map[uint]struct{}{}}
			if isCrossUnitMappingReference(m) {
				ref.AllowAny = true
			} else {
				ref.UnitIDs[*m.UnitUsahaID] = struct{}{}
			}

			if slug := strings.TrimSpace(m.Slug); slug != "" {
				refs.BySlug[slug] = ref
			}

			key := normalizeMappingNameKey(m.NamaMapping)
			if key == "" {
				continue
			}
			nameRef, ok := refs.ByName[key]
			if !ok {
				nameRef = &mappingUnitReference{UnitIDs: map[uint]struct{}{}}
				refs.ByName[key] = nameRef
			}
			if ref.AllowAny {
				nameRef.AllowAny = true
				continue
			}
			for unitID := range ref.UnitIDs {
				nameRef.UnitIDs[unitID] = struct{}{}
			}
		}
	}

	return refs, nil
}

func validateTransaksiMappingReference(refs *transaksiMappingReferences, mappingSlug string, deskripsi string, unitUsahaID uint) error {
	if refs == nil {
		return fmt.Errorf("Referensi MappingTransaksi tidak ditemukan")
	}

	ref := (*mappingUnitReference)(nil)
	if slug := strings.TrimSpace(mappingSlug); slug != "" {
		ref = refs.BySlug[slug]
		if ref == nil {
			return fmt.Errorf("Referensi MappingTransaksi tidak ditemukan")
		}
	} else {
		deskripsiKey := normalizeMappingNameKey(deskripsi)
		if deskripsiKey == "" {
			return nil
		}
		ref = refs.ByName[deskripsiKey]
		if ref == nil {
			return fmt.Errorf("Referensi MappingTransaksi tidak ditemukan")
		}
	}

	if ref.AllowAny {
		return nil
	}
	if _, ok := ref.UnitIDs[unitUsahaID]; !ok {
		return fmt.Errorf("Unit Usaha tidak sesuai referensi MappingTransaksi")
	}
	return nil
}

func newInventoryStockValidator(profileID *uint, unitUsahaID uint) (*inventoryStockValidator, error) {
	barangs, err := service.GetAllBarang(profileID)
	if err != nil {
		return nil, err
	}

	selectedBarangs := make([]models.Barang, 0, len(barangs))
	for _, barang := range barangs {
		if !barang.KartuPersediaan {
			continue
		}
		if barang.UnitUsahaID == nil || *barang.UnitUsahaID != unitUsahaID {
			continue
		}
		if len(splitInventoryAccounts(barang.LinkAkun)) == 0 {
			continue
		}
		selectedBarangs = append(selectedBarangs, barang)
	}

	if len(selectedBarangs) == 0 {
		return nil, nil
	}

	transaksis, err := service.GetTransactionsByProfile(profileID)
	if err != nil {
		return nil, err
	}
	unitScope := unitUsahaID
	transaksis = filterWorkbookTransactionsByUnit(transaksis, &unitScope)

	mappings, err := getAllJurnalMappings(profileID)
	if err != nil {
		return nil, err
	}
	mappings = filterWorkbookMappingsByUnit(mappings, &unitScope)

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

	runningStock := make(map[string]float64, len(selectedBarangs))
	for _, barang := range selectedBarangs {
		runningStock[barang.Slug] = computeCurrentStockQty(barang, transaksis, mappingBySlug, mappingByName)
	}

	return &inventoryStockValidator{
		Barangs:       selectedBarangs,
		MappingBySlug: mappingBySlug,
		MappingByName: mappingByName,
		RunningStock:  runningStock,
	}, nil
}

func computeCurrentStockQty(barang models.Barang, transaksis []models.Transaksi, mappingBySlug map[string]models.MappingTransaksi, mappingByName map[string][]models.MappingTransaksi) float64 {
	saldoQty := barang.SaldoAwalQty
	saldoNominal := float64(barang.SaldoAwalNominal)
	if saldoNominal == 0 && saldoQty > 0 && barang.HargaBeliAwal > 0 {
		saldoNominal = saldoQty * barang.HargaBeliAwal
	}

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

		details := mapping.Details
		if len(details) == 0 {
			details = []models.MappingTransaksiDetail{{AkunDebet: mapping.AkunDebet, AkunKredit: mapping.AkunKredit}}
		}

		for _, detail := range details {
			akunPersediaan, movement := resolvePersediaanMutation(detail)
			if akunPersediaan == "" || movement == "" || !barangUsesInventoryAccount(barang, akunPersediaan) {
				continue
			}

			qty := extractInventoryQuantity(firstNonEmpty(tx.Keterangan, tx.Deskripsi))
			prevAvgRate := computeAverageInventoryRate(saldoQty, saldoNominal)

			if movement == "masuk" {
				if qty > 0 {
					saldoQty += qty
				}
				saldoNominal += tx.Nominal
			} else {
				keluarNominal := tx.Nominal
				if qty > 0 {
					if prevAvgRate > 0 {
						keluarNominal = qty * prevAvgRate
					}
					saldoQty -= qty
				}
				saldoNominal -= keluarNominal
			}
			break
		}
	}

	manualEntries := []models.KartuPersediaanManual{}
	manualQuery := config.DB.Where("barang_slug = ?", barang.Slug).Order("tanggal asc, id asc")
	if barang.ProfileBUMDesID != nil {
		manualQuery = manualQuery.Where("profile_bum_des_id = ?", *barang.ProfileBUMDesID)
	}
	if barang.UnitUsahaID != nil {
		manualQuery = manualQuery.Where("unit_usaha_id = ?", *barang.UnitUsahaID)
	}
	if err := manualQuery.Find(&manualEntries).Error; err == nil {
		for _, manualEntry := range manualEntries {
			if strings.EqualFold(manualEntry.Jenis, "masuk") {
				saldoQty += manualEntry.Qty
				continue
			}
			saldoQty -= manualEntry.Qty
		}
	}

	return saldoQty
}

func (v *inventoryStockValidator) resolveCandidate(tx models.Transaksi) *inventoryStockCandidate {
	var best *inventoryStockCandidate
	for _, barang := range v.Barangs {
		if !transaksiMatchesBarang(tx, barang) {
			continue
		}

		mapping, ok := resolveInventoryMappingForBarangTx(tx, barang, v.MappingBySlug, v.MappingByName)
		if !ok {
			continue
		}

		details := mapping.Details
		if len(details) == 0 {
			details = []models.MappingTransaksiDetail{{AkunDebet: mapping.AkunDebet, AkunKredit: mapping.AkunKredit, LinkPersediaan: mapping.LinkPersediaan}}
		}

		movement := ""
		for _, detail := range details {
			akunPersediaan, resolvedMovement := resolvePersediaanMutation(detail)
			if akunPersediaan == "" || resolvedMovement == "" {
				continue
			}
			if !barangUsesInventoryAccount(barang, akunPersediaan) {
				continue
			}
			if !detail.LinkPersediaan && !mapping.LinkPersediaan {
				continue
			}
			movement = resolvedMovement
			break
		}
		if movement == "" {
			continue
		}

		score := len(normalizeInventoryText(barang.NamaBarang))
		if mapping.LinkPersediaan {
			score += 100
		}
		candidate := &inventoryStockCandidate{Barang: barang, Movement: movement, Score: score}
		if best == nil || candidate.Score > best.Score {
			best = candidate
		}
	}

	return best
}

func (v *inventoryStockValidator) validateAndApply(tx models.Transaksi) error {
	qty := extractInventoryQuantity(firstNonEmpty(tx.Keterangan, tx.Deskripsi))
	if qty <= 0 {
		return nil
	}

	candidate := v.resolveCandidate(tx)
	if candidate == nil {
		return nil
	}

	available := v.RunningStock[candidate.Barang.Slug]
	if candidate.Movement == "masuk" {
		v.RunningStock[candidate.Barang.Slug] = available + qty
		return nil
	}

	if candidate.Movement != "keluar" {
		return nil
	}

	if available+1e-9 < qty {
		displayQty := available
		if displayQty < 0 {
			displayQty = 0
		}
		satuan := strings.TrimSpace(candidate.Barang.Satuan)
		if satuan != "" {
			return fmt.Errorf("Maaf stok tidak mencukupi. Stok sejumlah %s %s. Lakukan update di Kartu Persediaan!", formatKartuPersediaanNumber(displayQty), satuan)
		}
		return fmt.Errorf("Maaf stok tidak mencukupi. Stok sejumlah %s. Lakukan update di Kartu Persediaan!", formatKartuPersediaanNumber(displayQty))
	}

	v.RunningStock[candidate.Barang.Slug] = available - qty
	return nil
}

func SaveTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload TransaksiPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if payload.UnitUsahaID == 0 {
		http.Error(w, "Unit Usaha ID is required", http.StatusBadRequest)
		return
	}

	// Determine Profile BUMDes ID
	var reqProfileID *uint
	if payload.SessionSlug != "" {
		loggedUser, err := service.GetUserBySlug(payload.SessionSlug)
		if err == nil && loggedUser != nil {
			reqProfileID = loggedUser.ProfileBUMDesID
		}
	}

	// Fallback to unit usaha lookup if admin
	if reqProfileID == nil {
		var unit models.UnitUsaha
		if err := config.DB.First(&unit, payload.UnitUsahaID).Error; err == nil {
			reqProfileID = &unit.ProfileID
		} else {
			http.Error(w, "Invalid Unit Usaha ID", http.StatusBadRequest)
			return
		}
	}

	mappingRefs, err := loadTransaksiMappingReferences(reqProfileID)
	if err != nil {
		http.Error(w, "Failed to load referensi MappingTransaksi", http.StatusInternalServerError)
		return
	}

	stockValidator, err := newInventoryStockValidator(reqProfileID, payload.UnitUsahaID)
	if err != nil {
		http.Error(w, "Failed to validate stok Kartu Persediaan", http.StatusInternalServerError)
		return
	}

	allMappings, err := getAllJurnalMappings(reqProfileID)
	if err != nil {
		http.Error(w, "Failed to load data mapping transaksi", http.StatusInternalServerError)
		return
	}
	unitScope := payload.UnitUsahaID
	allMappings = filterWorkbookMappingsByUnit(allMappings, &unitScope)
	mappingBySlug := make(map[string]models.MappingTransaksi, len(allMappings))
	mappingByName := make(map[string][]models.MappingTransaksi, len(allMappings))
	for _, mapping := range allMappings {
		if slug := strings.TrimSpace(mapping.Slug); slug != "" {
			mappingBySlug[slug] = mapping
		}
		key := normalizeJurnalLookupKey(mapping.NamaMapping)
		if key == "" {
			continue
		}
		mappingByName[key] = append(mappingByName[key], mapping)
	}

	var txToSave []models.Transaksi
	autoInventarisCandidates := make([]transaksiAutoInventarisCandidate, 0)
	contactMap := map[string]service.PelangganContactInput{}
	for idx, item := range payload.Items {
		if err := validateTransaksiMappingReference(mappingRefs, item.MappingSlug, item.Deskripsi, payload.UnitUsahaID); err != nil {
			http.Error(w, fmt.Sprintf("Baris ke-%d: %s", idx+1, err.Error()), http.StatusBadRequest)
			return
		}

		// Validasi dan Parsing Tanggal
		t, err := time.Parse("2006-01-02", item.Tanggal)
		if err != nil {
			http.Error(w, "Invalid date format, expected YYYY-MM-DD", http.StatusBadRequest)
			return
		}

		if item.TipeKas == "" || (item.TipeKas != "tambah" && item.TipeKas != "kurang") {
			continue // ignore invalid forms
		}

		statusBayar := normalizeTransaksiStatusBayar(item.StatusBayar, item.Keterangan)
		validasi := normalizeTransaksiValidasiStatus(item.Validasi, "Belum")
		txRow := models.Transaksi{
			UnitUsahaID:          payload.UnitUsahaID,
			ProfileBUMDesID:      *reqProfileID,
			Tanggal:              t,
			NamaPelangganPemasok: item.NamaPelangganPemasok,
			Keterangan:           item.Keterangan,
			Deskripsi:            item.Deskripsi,
			MappingSlug:          strings.TrimSpace(item.MappingSlug),
			MappingJenis:         strings.TrimSpace(item.MappingJenis),
			AkunDebet:            strings.TrimSpace(item.AkunDebet),
			AkunKredit:           strings.TrimSpace(item.AkunKredit),
			Validasi:             validasi,
			Nominal:              item.Nominal,
			TipeKas:              item.TipeKas,
			StatusBayar:          statusBayar,
		}

		if stockValidator != nil {
			if err := stockValidator.validateAndApply(txRow); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}

		txToSave = append(txToSave, txRow)

		if isValidasiSudah(validasi) && transaksiContainsBeliKeyword(item.Keterangan, item.Deskripsi) {
			mapping, ok := resolveInventoryMappingForBarangTx(txRow, models.Barang{}, mappingBySlug, mappingByName)
			if ok && mappingHasAsetTetapLink(mapping) {
				autoInventarisCandidates = append(autoInventarisCandidates, transaksiAutoInventarisCandidate{
					Transaksi: txRow,
					Mapping:   mapping,
				})
			}
		}

		namaKey := strings.ToLower(strings.TrimSpace(item.NamaPelangganPemasok))
		if namaKey != "" {
			contactMap[namaKey] = service.PelangganContactInput{
				Alamat:      strings.TrimSpace(item.Alamat),
				NoTelepon:   strings.TrimSpace(item.NoTelepon),
				PartnerType: strings.TrimSpace(item.PartnerType),
			}
		}
	}

	if len(txToSave) == 0 {
		http.Error(w, "No valid transaction data received", http.StatusBadRequest)
		return
	}

	addedPelanggan, addedSupplier, err := service.EnsurePartnersFromTransactions(txToSave, contactMap)
	if err != nil {
		http.Error(w, "Failed to sync pelanggan/supplier data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := service.SaveTransactions(txToSave); err != nil {
		http.Error(w, "Failed to save transactions: "+err.Error(), http.StatusInternalServerError)
		return
	}

	addedInventaris, skippedInventarisDup, err := createInventarisFromCandidates(reqProfileID, payload.UnitUsahaID, autoInventarisCandidates)
	if err != nil {
		http.Error(w, "Transaksi tersimpan tapi gagal sinkron inventaris: "+err.Error(), http.StatusInternalServerError)
		return
	}

	msg := "Transaksi saved successfully"
	if addedPelanggan > 0 {
		msg += " - Data Pelanggan ditambahkan"
	}
	if addedSupplier > 0 {
		msg += " - Data Supplier ditambahkan"
	}
	if addedInventaris > 0 {
		msg += " - Data Inventaris ditambahkan"
	}
	if skippedInventarisDup > 0 {
		msg += " - Data Inventaris duplikat dilewati"
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(msg))
}

func GetTransaksis(w http.ResponseWriter, r *http.Request) {
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

	data, err := service.GetTransactionsByProfile(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching transaksi", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func DeleteTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id == 0 {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}
	if err := config.DB.Delete(&models.Transaksi{}, id).Error; err != nil {
		http.Error(w, "Failed to delete transaksi", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Transaksi deleted successfully"))
}

func DeleteAllTransaksis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
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

	query := config.DB.Model(&models.Transaksi{})
	if reqProfileID != nil {
		query = query.Where("profile_bum_des_id = ?", *reqProfileID)
	}

	if err := query.Delete(&models.Transaksi{}).Error; err != nil {
		http.Error(w, "Failed to delete all transaksi", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("All transaksi deleted successfully"))
}

func UpdateTransaksi(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id == 0 {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var item TransaksiItemPayload
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	t, err := time.Parse("2006-01-02", item.Tanggal)
	if err != nil {
		http.Error(w, "Invalid date format, expected YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	var existing models.Transaksi
	if err := config.DB.First(&existing, id).Error; err != nil {
		http.Error(w, "Transaksi not found", http.StatusNotFound)
		return
	}

	var reqProfileID *uint
	if existing.ProfileBUMDesID != 0 {
		reqProfileID = &existing.ProfileBUMDesID
	} else {
		var unit models.UnitUsaha
		if err := config.DB.First(&unit, existing.UnitUsahaID).Error; err == nil {
			reqProfileID = &unit.ProfileID
		}
	}

	mappingRefs, err := loadTransaksiMappingReferences(reqProfileID)
	if err != nil {
		http.Error(w, "Failed to load referensi MappingTransaksi", http.StatusInternalServerError)
		return
	}

	if err := validateTransaksiMappingReference(mappingRefs, item.MappingSlug, item.Deskripsi, existing.UnitUsahaID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if item.TipeKas == "" || (item.TipeKas != "tambah" && item.TipeKas != "kurang") {
		http.Error(w, "Tipe kas tidak valid", http.StatusBadRequest)
		return
	}

	statusBayar := normalizeTransaksiStatusBayar(item.StatusBayar, item.Keterangan)
	newValidasi := normalizeTransaksiValidasiStatus(item.Validasi, existing.Validasi)

	updates := map[string]interface{}{
		"tanggal":                t,
		"nama_pelanggan_pemasok": item.NamaPelangganPemasok,
		"keterangan":             item.Keterangan,
		"deskripsi":              item.Deskripsi,
		"mapping_slug":           strings.TrimSpace(item.MappingSlug),
		"mapping_jenis":          strings.TrimSpace(item.MappingJenis),
		"akun_debet":             strings.TrimSpace(item.AkunDebet),
		"akun_kredit":            strings.TrimSpace(item.AkunKredit),
		"validasi":               newValidasi,
		"nominal":                item.Nominal,
		"tipe_kas":               item.TipeKas,
		"status_bayar":           statusBayar,
	}

	if err := config.DB.Model(&models.Transaksi{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		http.Error(w, "Failed to update transaksi", http.StatusInternalServerError)
		return
	}

	contactMap := map[string]service.PelangganContactInput{}
	namaKey := strings.ToLower(strings.TrimSpace(item.NamaPelangganPemasok))
	if namaKey != "" {
		contactMap[namaKey] = service.PelangganContactInput{
			Alamat:      strings.TrimSpace(item.Alamat),
			NoTelepon:   strings.TrimSpace(item.NoTelepon),
			PartnerType: strings.TrimSpace(item.PartnerType),
		}
	}

	updatedTx := models.Transaksi{
		ID:                   existing.ID,
		UnitUsahaID:          existing.UnitUsahaID,
		ProfileBUMDesID:      existing.ProfileBUMDesID,
		Tanggal:              t,
		NamaPelangganPemasok: item.NamaPelangganPemasok,
		Keterangan:           item.Keterangan,
		Deskripsi:            item.Deskripsi,
		MappingSlug:          strings.TrimSpace(item.MappingSlug),
		MappingJenis:         strings.TrimSpace(item.MappingJenis),
		AkunDebet:            strings.TrimSpace(item.AkunDebet),
		AkunKredit:           strings.TrimSpace(item.AkunKredit),
		Validasi:             newValidasi,
		Nominal:              item.Nominal,
		TipeKas:              item.TipeKas,
		StatusBayar:          statusBayar,
	}

	if _, _, err := service.EnsurePartnersFromTransactions([]models.Transaksi{updatedTx}, contactMap); err != nil {
		http.Error(w, "Failed to sync pelanggan/supplier data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	updatedMsg := "Transaksi updated successfully"

	if !isValidasiSudah(existing.Validasi) && isValidasiSudah(newValidasi) && transaksiContainsBeliKeyword(updatedTx.Keterangan, updatedTx.Deskripsi) {
		allMappings, err := getAllJurnalMappings(reqProfileID)
		if err != nil {
			http.Error(w, "Failed to load data mapping transaksi", http.StatusInternalServerError)
			return
		}
		unitScope := existing.UnitUsahaID
		allMappings = filterWorkbookMappingsByUnit(allMappings, &unitScope)
		mappingBySlug := make(map[string]models.MappingTransaksi, len(allMappings))
		mappingByName := make(map[string][]models.MappingTransaksi, len(allMappings))
		for _, mapping := range allMappings {
			if slug := strings.TrimSpace(mapping.Slug); slug != "" {
				mappingBySlug[slug] = mapping
			}
			key := normalizeJurnalLookupKey(mapping.NamaMapping)
			if key == "" {
				continue
			}
			mappingByName[key] = append(mappingByName[key], mapping)
		}

		mapping, ok := resolveInventoryMappingForBarangTx(updatedTx, models.Barang{}, mappingBySlug, mappingByName)
		if ok && mappingHasAsetTetapLink(mapping) {
			addedInventaris, skippedInventarisDup, err := createInventarisFromCandidates(reqProfileID, existing.UnitUsahaID, []transaksiAutoInventarisCandidate{{
				Transaksi: updatedTx,
				Mapping:   mapping,
			}})
			if err != nil {
				http.Error(w, "Transaksi ter-update tapi gagal sinkron inventaris: "+err.Error(), http.StatusInternalServerError)
				return
			}
			if addedInventaris > 0 {
				updatedMsg += " - Data Inventaris ditambahkan"
			}
			if skippedInventarisDup > 0 {
				updatedMsg += " - Data Inventaris duplikat dilewati"
			}
		}
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(updatedMsg))
}
