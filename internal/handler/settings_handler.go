package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sibumdes/internal/service"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type geminiSettingsPayload struct {
	GeminiAPIKey string `json:"gemini_api_key"`
}

type geminiSettingsResponse struct {
	HasKey    bool   `json:"has_key"`
	MaskedKey string `json:"masked_key"`
}

func isUserPengembang(sessionSlug string) bool {
	loggedUser, err := service.GetUserBySlug(sessionSlug)
	if err != nil || loggedUser == nil {
		return false
	}

	profileName := strings.ToLower(strings.TrimSpace(loggedUser.ProfileBUMDes.NamaBUMDes))
	return strings.Contains(profileName, "pengembang")
}

func GetGeminiSettings(w http.ResponseWriter, r *http.Request) {
	// Validate profile BUMDes pengembang
	sessionSlug := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(sessionSlug, "Bearer ") {
		sessionSlug = sessionSlug[7:]
	}

	loggedUser, err := service.GetUserBySlug(sessionSlug)
	if err != nil || loggedUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profileName := strings.ToLower(strings.TrimSpace(loggedUser.ProfileBUMDes.NamaBUMDes))
	if !strings.Contains(profileName, "pengembang") {
		http.Error(w, "Only PENGEMBANG profile can access settings", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	resp := geminiSettingsResponse{
		HasKey:    key != "",
		MaskedKey: maskAPIKey(key),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func SaveGeminiSettings(w http.ResponseWriter, r *http.Request) {
	// Validate profile BUMDes pengembang
	sessionSlug := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(sessionSlug, "Bearer ") {
		sessionSlug = sessionSlug[7:]
	}

	loggedUser, err := service.GetUserBySlug(sessionSlug)
	if err != nil || loggedUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profileName := strings.ToLower(strings.TrimSpace(loggedUser.ProfileBUMDes.NamaBUMDes))
	if !strings.Contains(profileName, "pengembang") {
		http.Error(w, "Only PENGEMBANG profile can access settings", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := geminiSettingsPayload{}
	contentType := strings.ToLower(r.Header.Get("Content-Type"))

	if strings.Contains(contentType, "application/json") {
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Payload JSON tidak valid", http.StatusBadRequest)
			return
		}
	} else {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "Payload form tidak valid", http.StatusBadRequest)
			return
		}
		payload.GeminiAPIKey = r.FormValue("gemini_api_key")
	}

	key := strings.TrimSpace(payload.GeminiAPIKey)
	if key == "" {
		http.Error(w, "GEMINI_API_KEY wajib diisi", http.StatusBadRequest)
		return
	}

	if err := upsertEnvVar(".env", "GEMINI_API_KEY", key); err != nil {
		http.Error(w, "Gagal menyimpan .env: "+err.Error(), http.StatusInternalServerError)
		return
	}

	_ = os.Setenv("GEMINI_API_KEY", key)

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("GEMINI_API_KEY berhasil disimpan. Service akan direstart..."))

	go restartServiceAsync()
}

func upsertEnvVar(filePath string, key string, value string) error {
	var lines []string

	data, err := os.ReadFile(filePath)
	if err != nil {
		if !os.IsNotExist(err) {
			return err
		}
		lines = []string{}
	} else {
		normalized := strings.ReplaceAll(string(data), "\r\n", "\n")
		lines = strings.Split(normalized, "\n")
	}

	entry := key + "=" + strconv.Quote(value)
	updated := false

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, key+"=") || strings.HasPrefix(trimmed, "export "+key+"=") {
			lines[i] = entry
			updated = true
		}
	}

	if !updated {
		if len(lines) == 1 && strings.TrimSpace(lines[0]) == "" {
			lines[0] = entry
		} else {
			lines = append(lines, entry)
		}
	}

	content := strings.Join(lines, "\n")
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}

	return os.WriteFile(filePath, []byte(content), 0644)
}

func maskAPIKey(key string) string {
	if key == "" {
		return ""
	}
	if len(key) <= 8 {
		return strings.Repeat("*", len(key))
	}
	return fmt.Sprintf("%s%s%s", key[:4], strings.Repeat("*", len(key)-8), key[len(key)-4:])
}

func restartServiceAsync() {
	time.Sleep(500 * time.Millisecond)

	if os.Getenv("AIR_WD") != "" || os.Getenv("AIR_ENV") != "" {
		os.Exit(0)
		return
	}

	execPath, err := os.Executable()
	if err != nil {
		os.Exit(0)
		return
	}

	if err := syscall.Exec(execPath, os.Args, os.Environ()); err != nil {
		os.Exit(0)
	}
}
