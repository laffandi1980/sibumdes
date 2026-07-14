package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

type saldoAwalReportPayload struct {
	Period              string          `json:"period"`
	Rows                json.RawMessage `json:"rows"`
	LastMasterRefreshAt string          `json:"last_master_refresh_at"`
	ProfileBUMDesID     *uint           `json:"profile_bumdes_id,omitempty"`
}

type saldoAwalReportResponse struct {
	Period              string          `json:"period"`
	Rows                json.RawMessage `json:"rows"`
	LastMasterRefreshAt *time.Time      `json:"last_master_refresh_at,omitempty"`
	UpdatedAt           *time.Time      `json:"updated_at,omitempty"`
	ProfileBUMDesID     *uint           `json:"profile_bumdes_id,omitempty"`
	ScopeKey            string          `json:"scope_key"`
}

func getSaldoAwalSessionSlug(r *http.Request) string {
	sessionSlug := strings.TrimSpace(r.URL.Query().Get("session_slug"))
	if sessionSlug == "" {
		sessionSlug = strings.TrimSpace(r.Header.Get("Authorization"))
		if strings.HasPrefix(sessionSlug, "Bearer ") {
			sessionSlug = strings.TrimSpace(sessionSlug[7:])
		}
	}
	return sessionSlug
}

func resolveSaldoAwalScope(r *http.Request, payloadProfileID *uint) (string, *uint, error) {
	sessionSlug := getSaldoAwalSessionSlug(r)
	if sessionSlug == "" {
		return "", nil, errors.New("missing session")
	}

	loggedUser, err := service.GetUserBySlug(sessionSlug)
	if err != nil || loggedUser == nil {
		return "", nil, errors.New("unauthorized")
	}

	if loggedUser.ProfileBUMDesID != nil {
		scopeKey := "profile:" + strconv.FormatUint(uint64(*loggedUser.ProfileBUMDesID), 10)
		return scopeKey, loggedUser.ProfileBUMDesID, nil
	}

	profileID := payloadProfileID
	if profileID == nil {
		if queryValue := strings.TrimSpace(r.URL.Query().Get("profile_bumdes_id")); queryValue != "" {
			parsed, parseErr := strconv.ParseUint(queryValue, 10, 64)
			if parseErr == nil {
				resolved := uint(parsed)
				profileID = &resolved
			}
		}
	}

	if profileID != nil {
		scopeKey := "profile:" + strconv.FormatUint(uint64(*profileID), 10)
		return scopeKey, profileID, nil
	}

	return "global", nil, nil
}

func GetSaldoAwalReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	scopeKey, profileID, err := resolveSaldoAwalScope(r, nil)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	report, err := service.GetSaldoAwalReportByScope(scopeKey)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		http.Error(w, "Gagal memuat laporan saldo awal", http.StatusInternalServerError)
		return
	}

	response := saldoAwalReportResponse{
		Period:          "",
		Rows:            json.RawMessage("[]"),
		ProfileBUMDesID: profileID,
		ScopeKey:        scopeKey,
	}

	if report != nil && report.ID != 0 {
		response.Period = report.Period
		response.ProfileBUMDesID = report.ProfileBUMDesID
		response.ScopeKey = report.ScopeKey
		response.LastMasterRefreshAt = report.LastMasterRefreshAt
		response.UpdatedAt = &report.UpdatedAt
		if strings.TrimSpace(report.RowsJSON) != "" {
			response.Rows = json.RawMessage(report.RowsJSON)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func SaveSaldoAwalReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := saldoAwalReportPayload{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Payload JSON tidak valid", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(payload.Period) == "" {
		http.Error(w, "Periode wajib diisi", http.StatusBadRequest)
		return
	}

	rowsJSON := strings.TrimSpace(string(payload.Rows))
	if rowsJSON == "" {
		rowsJSON = "[]"
		payload.Rows = json.RawMessage(rowsJSON)
	}

	if !json.Valid(payload.Rows) {
		http.Error(w, "Data baris saldo awal tidak valid", http.StatusBadRequest)
		return
	}

	scopeKey, profileID, err := resolveSaldoAwalScope(r, payload.ProfileBUMDesID)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var refreshedAt *time.Time
	if strings.TrimSpace(payload.LastMasterRefreshAt) != "" {
		parsed, parseErr := time.Parse(time.RFC3339, strings.TrimSpace(payload.LastMasterRefreshAt))
		if parseErr != nil {
			http.Error(w, "Format last_master_refresh_at tidak valid", http.StatusBadRequest)
			return
		}
		refreshedAt = &parsed
	}

	report := &models.SaldoAwalReport{
		ScopeKey:            scopeKey,
		ProfileBUMDesID:     profileID,
		Period:              strings.TrimSpace(payload.Period),
		RowsJSON:            rowsJSON,
		LastMasterRefreshAt: refreshedAt,
	}

	if err := service.SaveSaldoAwalReport(report); err != nil {
		http.Error(w, "Gagal menyimpan laporan saldo awal", http.StatusInternalServerError)
		return
	}

	response := saldoAwalReportResponse{
		Period:              report.Period,
		Rows:                json.RawMessage(report.RowsJSON),
		LastMasterRefreshAt: report.LastMasterRefreshAt,
		UpdatedAt:           &report.UpdatedAt,
		ProfileBUMDesID:     report.ProfileBUMDesID,
		ScopeKey:            report.ScopeKey,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
