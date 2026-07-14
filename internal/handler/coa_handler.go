package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func resolveChartOfAccountScope(sessionSlug string) (*uint, bool) {
	if sessionSlug == "" {
		return nil, false
	}

	loggedUser, err := service.GetUserBySlug(sessionSlug)
	if err != nil || loggedUser == nil {
		return nil, false
	}

	profileName := strings.ToLower(strings.TrimSpace(loggedUser.ProfileBUMDes.NamaBUMDes))
	if strings.Contains(profileName, "pengembang") {
		return nil, true
	}

	return loggedUser.ProfileBUMDesID, false
}

func GetChartOfAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	profileID, includeAllProfiles := resolveChartOfAccountScope(r.URL.Query().Get("session_slug"))
	entries, err := service.GetAllChartOfAccounts(profileID, includeAllProfiles)
	if err != nil {
		http.Error(w, "Error fetching chart of accounts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func ReplaceChartOfAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var entries []models.ChartOfAccount
	if err := json.NewDecoder(r.Body).Decode(&entries); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	profileID, includeAllProfiles := resolveChartOfAccountScope(r.URL.Query().Get("session_slug"))
	if err := service.ReplaceChartOfAccounts(profileID, includeAllProfiles, entries); err != nil {
		http.Error(w, "Error saving chart of accounts: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Chart of accounts saved successfully"))
}

func DeleteChartOfAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	profileID, includeAllProfiles := resolveChartOfAccountScope(r.URL.Query().Get("session_slug"))
	if err := service.DeleteAllChartOfAccounts(profileID, includeAllProfiles); err != nil {
		http.Error(w, "Error deleting chart of accounts", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Chart of accounts deleted successfully"))
}
