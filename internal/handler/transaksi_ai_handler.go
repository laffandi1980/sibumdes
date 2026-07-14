package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"

	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

type TransaksiAISuggestRequest struct {
	Keterangan  string `json:"keterangan"`
	SessionSlug string `json:"session_slug"`
}

type TransaksiAISuggestResponse struct {
	Deskripsi   string  `json:"deskripsi"`
	Nominal     float64 `json:"nominal"`
	TipeKas     string  `json:"tipe_kas"`
	UnitUsahaID *uint   `json:"unit_usaha_id,omitempty"`
}

type geminiTransaksiSuggest struct {
	NamaMapping string  `json:"nama_mapping"`
	Nominal     float64 `json:"nominal"`
	TipeKas     string  `json:"tipe_kas"`
}

func normalizeMappingName(name string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(name))), " ")
}

func parseIndonesianNumber(raw string) float64 {
	cleaned := strings.TrimSpace(strings.ToLower(raw))
	cleaned = strings.ReplaceAll(cleaned, "rp", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")

	if cleaned == "" {
		return 0
	}

	lastComma := strings.LastIndex(cleaned, ",")
	lastDot := strings.LastIndex(cleaned, ".")
	if lastComma >= 0 && lastDot >= 0 {
		if lastComma > lastDot {
			cleaned = strings.ReplaceAll(cleaned, ".", "")
			cleaned = strings.ReplaceAll(cleaned, ",", ".")
		} else {
			cleaned = strings.ReplaceAll(cleaned, ",", "")
		}
	} else if lastComma >= 0 {
		cleaned = strings.ReplaceAll(cleaned, ".", "")
		cleaned = strings.ReplaceAll(cleaned, ",", ".")
	} else {
		cleaned = strings.ReplaceAll(cleaned, ".", "")
	}

	value, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0
	}
	return value
}

func extractCalculatedNominalFromKeterangan(keterangan string) float64 {
	text := strings.ToLower(strings.TrimSpace(keterangan))
	if text == "" {
		return 0
	}

	patterns := []*regexp.Regexp{
		regexp.MustCompile(`@\s*(rp\s*)?([\d.,]+)\s*(?:x|×)?\s*(\d+(?:[.,]\d+)?)\s*(?:buah|pcs|unit|item|sak|karung|ekor|kg|gram|liter|ltr|pak|pack|botol)?\b`),
		regexp.MustCompile(`(\d+(?:[.,]\d+)?)\s*(?:buah|pcs|unit|item|sak|karung|ekor|kg|gram|liter|ltr|pak|pack|botol)\s*@\s*(rp\s*)?([\d.,]+)\b`),
		regexp.MustCompile(`(\d+(?:[.,]\d+)?)\s*(?:x|×)\s*(rp\s*)?([\d.,]+)\b`),
	}

	for idx, pattern := range patterns {
		matches := pattern.FindStringSubmatch(text)
		if len(matches) == 0 {
			continue
		}

		var qtyRaw, priceRaw string
		switch idx {
		case 0:
			priceRaw = matches[2]
			qtyRaw = matches[3]
		default:
			qtyRaw = matches[1]
			priceRaw = matches[3]
		}

		qty := parseIndonesianNumber(qtyRaw)
		price := parseIndonesianNumber(priceRaw)
		if qty > 0 && price > 0 {
			return qty * price
		}
	}

	return 0
}

func loadTransaksiSuggestMappings(profileID *uint) ([]models.MappingTransaksi, error) {
	kinds := []string{"harian", "non_rutin", "umum", "jurnal"}
	result := make([]models.MappingTransaksi, 0)
	seen := map[string]struct{}{}

	for _, kind := range kinds {
		mappings, err := service.GetAllMappingTransaksi(profileID, kind)
		if err != nil {
			return nil, err
		}
		for _, mapping := range mappings {
			unitKey := ""
			if mapping.UnitUsahaID != nil {
				unitKey = strconv.FormatUint(uint64(*mapping.UnitUsahaID), 10)
			}
			key := strings.Join([]string{
				normalizeMappingName(mapping.NamaMapping),
				unitKey,
				strings.ToLower(strings.TrimSpace(mapping.CashInOut)),
				strings.ToLower(strings.TrimSpace(mapping.TipeDefault)),
				strings.ToLower(strings.TrimSpace(mapping.AkunDebet)),
				strings.ToLower(strings.TrimSpace(mapping.AkunKredit)),
			}, "|")
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}
			result = append(result, mapping)
		}
	}

	return result, nil
}

func SuggestTransaksiAI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TransaksiAISuggestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	req.Keterangan = strings.TrimSpace(req.Keterangan)
	if req.Keterangan == "" {
		http.Error(w, "Keterangan wajib diisi", http.StatusBadRequest)
		return
	}

	geminiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if geminiKey == "" {
		http.Error(w, "GEMINI_API_KEY tidak ditemukan", http.StatusInternalServerError)
		return
	}

	var profileID *uint
	if req.SessionSlug != "" {
		user, err := service.GetUserBySlug(req.SessionSlug)
		if err == nil && user != nil && user.ProfileBUMDesID != nil && *user.ProfileBUMDesID != 0 {
			profileID = user.ProfileBUMDesID
		}
	}

	mappings, err := loadTransaksiSuggestMappings(profileID)
	if err != nil || len(mappings) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(TransaksiAISuggestResponse{})
		return
	}

	// Build mapping list for prompt - limit to most relevant fields
	type mappingItem struct {
		NamaMapping       string `json:"nama_mapping"`
		KategoriTransaksi string `json:"kategori_transaksi"`
		TipeDefault       string `json:"tipe_default"`
	}
	items := make([]mappingItem, 0, len(mappings))
	for _, m := range mappings {
		items = append(items, mappingItem{
			NamaMapping:       m.NamaMapping,
			KategoriTransaksi: m.KategoriTransaksi,
			TipeDefault:       m.TipeDefault,
		})
	}
	mappingJSON, _ := json.Marshal(items)

	instruction := fmt.Sprintf(`Respons HANYA dengan JSON VALID (no markdown, no text lain) dengan format: {"nama_mapping":"","nominal":0,"tipe_kas":""}
  
Mapping pilihan: %s

Keterangan: %s

Instruksi:
- Cocokkan keterangan dengan nama_mapping dari daftar, atau "" jika tidak cocok
- Ekstrak nominal total transaksi dari keterangan, atau 0 jika tidak ada
- Jika ada pola harga satuan seperti "@100000 8 buah" atau "8 buah @100000", hitung totalnya sebagai harga x jumlah
- Tentukan tipe_kas: "tambah" jika penerimaan/masuk, "kurang" jika pengeluaran/keluar`, string(mappingJSON), req.Keterangan)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": instruction}}},
		},
		"generationConfig": map[string]interface{}{
			"temperature":      0.1,
			"maxOutputTokens":  512,
			"responseMimeType": "application/json",
		},
	}
	reqBody, _ := json.Marshal(payload)

	modelsToTry := listGeminiGenerateModels(geminiKey)
	if len(modelsToTry) == 0 {
		modelsToTry = []string{
			"models/gemini-2.5-flash",
			"models/gemini-2.5-pro",
			"models/gemini-2.0-flash",
		}
	}

	var out map[string]interface{}
	var lastErr error
	for _, modelName := range modelsToTry {
		urlGemini := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/%s:generateContent?key=%s", strings.TrimPrefix(modelName, "/"), geminiKey)
		httpReq, err := http.NewRequest(http.MethodPost, urlGemini, bytes.NewBuffer(reqBody))
		if err != nil {
			lastErr = fmt.Errorf("request creation error: %w", err)
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("network error: %w", err)
			continue
		}

		respBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if err != nil {
			lastErr = fmt.Errorf("response read error: %w", err)
			continue
		}

		if resp.StatusCode >= 300 {
			lastErr = fmt.Errorf("model %s status %d: %s", modelName, resp.StatusCode, strings.TrimSpace(string(respBytes)))
			log.Printf("[DEBUG] Gemini error: %v", lastErr)
			continue
		}

		if err := json.Unmarshal(respBytes, &out); err != nil {
			lastErr = fmt.Errorf("json unmarshal error: %w. response: %s", err, strings.TrimSpace(string(respBytes)))
			log.Printf("[DEBUG] %v", lastErr)
			continue
		}

		lastErr = nil
		break
	}

	if lastErr != nil {
		log.Printf("[DEBUG] All Gemini models failed for keterangan '%s': %v", req.Keterangan, lastErr)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(TransaksiAISuggestResponse{})
		return
	}

	text := extractGeminiText(out)
	if strings.TrimSpace(text) == "" {
		log.Printf("[DEBUG] Empty Gemini response for keterangan '%s'", req.Keterangan)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(TransaksiAISuggestResponse{})
		return
	}

	log.Printf("[DEBUG] Gemini raw response: %s", text)

	var suggest geminiTransaksiSuggest
	if err := parseGeminiSuggestJSON(text, &suggest); err != nil {
		log.Printf("[DEBUG] Parse JSON failed for '%s': %v", text, err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(TransaksiAISuggestResponse{})
		return
	}

	result := TransaksiAISuggestResponse{
		Deskripsi: suggest.NamaMapping,
		Nominal:   suggest.Nominal,
		TipeKas:   suggest.TipeKas,
	}

	if calculatedNominal := extractCalculatedNominalFromKeterangan(req.Keterangan); calculatedNominal > 0 {
		result.Nominal = calculatedNominal
	}

	suggestName := normalizeMappingName(suggest.NamaMapping)
	if suggestName != "" {
		for i := range mappings {
			if normalizeMappingName(mappings[i].NamaMapping) == suggestName {
				result.UnitUsahaID = mappings[i].UnitUsahaID
				break
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func parseGeminiSuggestJSON(text string, out *geminiTransaksiSuggest) error {
	cleaned := strings.TrimSpace(text)

	if cleaned == "" {
		return fmt.Errorf("empty text")
	}

	// Coba parse langsung dulu
	if err := json.Unmarshal([]byte(cleaned), out); err == nil {
		return nil
	}

	// Strip markdown code blocks ```json ... ```
	re := regexp.MustCompile("(?s)```(?:json)?\\s*([\\s\\S]*?)\\s*```")
	if m := re.FindStringSubmatch(cleaned); len(m) > 1 {
		cleaned = strings.TrimSpace(m[1])
		if err := json.Unmarshal([]byte(cleaned), out); err == nil {
			return nil
		}
	}

	// Try to find raw JSON object
	start := strings.Index(cleaned, "{")
	end := strings.LastIndex(cleaned, "}")
	if start >= 0 && end > start {
		candidate := strings.TrimSpace(cleaned[start : end+1])
		if err := json.Unmarshal([]byte(candidate), out); err == nil {
			return nil
		}
	}

	// Last resort: log what we got and fail
	log.Printf("[DEBUG] Could not parse JSON from: %s", cleaned)
	return fmt.Errorf("failed to parse JSON from Gemini response")
}
