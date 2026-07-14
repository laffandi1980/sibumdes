package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

type DeskHelpCalendarRequest struct {
	Emails   string `json:"emails"`
	Prompt   string `json:"prompt"`
	Timezone string `json:"timezone"`
	EventDate string `json:"event_date"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	AlarmHours int  `json:"alarm_hours"`
	AutoCreate bool `json:"auto_create"`
}

type DeskHelpCalendarResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	CalendarURL  string `json:"calendar_url"`
	Title        string `json:"title"`
	StartRFC3339 string `json:"start_rfc3339"`
	EndRFC3339   string `json:"end_rfc3339"`
	AlarmHours   int    `json:"alarm_hours"`
	AutoCreated  bool   `json:"auto_created"`
}

type DeskHelpGoogleStatusResponse struct {
	Connected bool `json:"connected"`
}

type geminiCalendarExtract struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Location    string `json:"location"`
	Start       string `json:"start_datetime"`
	End         string `json:"end_datetime"`
	Timezone    string `json:"timezone"`
}

func DeskHelpGenerateCalendar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req DeskHelpCalendarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	req.Emails = strings.TrimSpace(req.Emails)
	req.Prompt = strings.TrimSpace(req.Prompt)
	req.Timezone = strings.TrimSpace(req.Timezone)
	req.EventDate = strings.TrimSpace(req.EventDate)
	req.StartTime = strings.TrimSpace(req.StartTime)
	req.EndTime = strings.TrimSpace(req.EndTime)
	if req.Timezone == "" {
		req.Timezone = "Asia/Jakarta"
	}
	if req.AlarmHours < 0 {
		req.AlarmHours = 0
	}
	if req.AlarmHours > 72 {
		req.AlarmHours = 72
	}

	if req.Emails == "" {
		http.Error(w, "Email undangan wajib diisi", http.StatusBadRequest)
		return
	}
	if req.Prompt == "" {
		http.Error(w, "Perintah event wajib diisi", http.StatusBadRequest)
		return
	}

	emails, err := parseAndValidateEmails(req.Emails)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	geminiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if geminiKey == "" {
		http.Error(w, "GEMINI_API_KEY tidak ditemukan di environment", http.StatusInternalServerError)
		return
	}

	extracted, err := geminiExtractCalendarData(req.Prompt, req.Timezone, geminiKey)
	if err != nil {
		http.Error(w, "Gagal memproses prompt dengan Gemini: "+err.Error(), http.StatusInternalServerError)
		return
	}
	extracted = stripGoogleMeetArtifacts(extracted)

	loc, tzErr := time.LoadLocation(req.Timezone)
	if tzErr != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}

	startTime, endTime := normalizeTimes(extracted, loc, req.EventDate, req.StartTime, req.EndTime)
	if req.AlarmHours > 0 {
		alarmText := fmt.Sprintf("\n\nPengingat: %d jam sebelum event.", req.AlarmHours)
		extracted.Description = strings.TrimSpace(extracted.Description + alarmText)
	}
	calendarURL := ""
	autoCreated := false
	oauthReady := isGoogleCalendarOAuthConfigured()

	if req.AutoCreate {
		if !oauthReady {
			http.Error(w, "Google belum terhubung. Klik Hubungkan Google terlebih dahulu.", http.StatusBadRequest)
			return
		}

		htmlLink, err := createGoogleCalendarEventAuto(extracted, emails, startTime, endTime, req.Timezone, req.AlarmHours)
		if err != nil {
			http.Error(w, "Auto-create gagal: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if strings.TrimSpace(htmlLink) == "" {
			http.Error(w, "Auto-create gagal: link event kosong", http.StatusInternalServerError)
			return
		}

		calendarURL = htmlLink
		autoCreated = true
	} else {
		calendarURL = buildGoogleCalendarURL(extracted, emails, startTime, endTime, req.Timezone)
	}

	message := "Link Google Calendar manual berhasil dibuat"
	if req.AutoCreate {
		message = "Event berhasil dibuat otomatis ke Google Calendar"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(DeskHelpCalendarResponse{
		Success:      true,
		Message:      message,
		CalendarURL:  calendarURL,
		Title:        extracted.Title,
		StartRFC3339: startTime.Format(time.RFC3339),
		EndRFC3339:   endTime.Format(time.RFC3339),
		AlarmHours:   req.AlarmHours,
		AutoCreated:  autoCreated,
	})
}

func DeskHelpGoogleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(DeskHelpGoogleStatusResponse{Connected: isGoogleCalendarOAuthConfigured()})
}

func DeskHelpGoogleAuthURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	redirectURI := getGoogleRedirectURI()
	if clientID == "" {
		http.Error(w, "GOOGLE_CLIENT_ID belum diatur di .env", http.StatusBadRequest)
		return
	}

	params := url.Values{}
	params.Set("client_id", clientID)
	params.Set("redirect_uri", redirectURI)
	params.Set("response_type", "code")
	params.Set("scope", "https://www.googleapis.com/auth/calendar.events")
	params.Set("access_type", "offline")
	params.Set("prompt", "consent")
	params.Set("include_granted_scopes", "true")

	authURL := "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"auth_url": authURL})
}

func DeskHelpGoogleCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if code == "" {
		http.Error(w, "Authorization code tidak ditemukan", http.StatusBadRequest)
		return
	}

	refreshToken, err := exchangeGoogleOAuthCodeForRefreshToken(code)
	if err != nil {
		http.Error(w, "Gagal exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if refreshToken == "" {
		http.Error(w, "Google tidak mengirim refresh_token. Ulangi koneksi dengan prompt consent.", http.StatusBadRequest)
		return
	}

	if err := upsertEnvVar(".env", "GOOGLE_REFRESH_TOKEN", refreshToken); err != nil {
		http.Error(w, "Gagal menyimpan refresh token: "+err.Error(), http.StatusInternalServerError)
		return
	}
	_ = os.Setenv("GOOGLE_REFRESH_TOKEN", refreshToken)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("<html><body><h3>Google Calendar berhasil terhubung.</h3><p>Silakan kembali ke aplikasi dan muat ulang halaman Desk Help.</p><script>setTimeout(function(){ window.close(); }, 1500);</script></body></html>"))
}

func isGoogleCalendarOAuthConfigured() bool {
	clientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	redirectURI := getGoogleRedirectURI()
	refreshToken := strings.TrimSpace(os.Getenv("GOOGLE_REFRESH_TOKEN"))
	return clientID != "" && clientSecret != "" && redirectURI != "" && refreshToken != ""
}

func exchangeGoogleOAuthCodeForRefreshToken(code string) (string, error) {
	clientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	redirectURI := getGoogleRedirectURI()

	if clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET belum lengkap")
	}

	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("redirect_uri", redirectURI)
	form.Set("grant_type", "authorization_code")

	resp, err := http.Post("https://oauth2.googleapis.com/token", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var out map[string]interface{}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", err
	}
	refreshToken, _ := out["refresh_token"].(string)
	return strings.TrimSpace(refreshToken), nil
}

func getGoogleRedirectURI() string {
	redirectURI := strings.TrimSpace(os.Getenv("GOOGLE_REDIRECT_URI"))
	if redirectURI != "" {
		return redirectURI
	}
	return "http://localhost:8080/api/desk-help/google/callback"
}

func getGoogleAccessTokenFromRefreshToken() (string, error) {
	clientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	refreshToken := strings.TrimSpace(os.Getenv("GOOGLE_REFRESH_TOKEN"))
	if clientID == "" || clientSecret == "" || refreshToken == "" {
		return "", fmt.Errorf("konfigurasi OAuth Google belum lengkap")
	}

	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("refresh_token", refreshToken)
	form.Set("grant_type", "refresh_token")

	resp, err := http.Post("https://oauth2.googleapis.com/token", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var out map[string]interface{}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", err
	}
	accessToken, _ := out["access_token"].(string)
	if strings.TrimSpace(accessToken) == "" {
		return "", fmt.Errorf("access_token kosong")
	}
	return accessToken, nil
}

func createGoogleCalendarEventAuto(g *geminiCalendarExtract, emails []string, start, end time.Time, timezone string, alarmHours int) (string, error) {
	accessToken, err := getGoogleAccessTokenFromRefreshToken()
	if err != nil {
		return "", err
	}

	g = stripGoogleMeetArtifacts(g)

	attendees := make([]map[string]string, 0, len(emails))
	for _, em := range emails {
		attendees = append(attendees, map[string]string{"email": em})
	}

	reminders := map[string]interface{}{"useDefault": true}
	if alarmHours >= 0 {
		minutes := alarmHours * 60
		if minutes > 40320 {
			minutes = 40320
		}
		reminders = map[string]interface{}{
			"useDefault": false,
			"overrides": []map[string]interface{}{{
				"method":  "popup",
				"minutes": minutes,
			}},
		}
	}

	payload := map[string]interface{}{
		"summary":     strings.TrimSpace(g.Title),
		"description": strings.TrimSpace(g.Description),
		"location":    strings.TrimSpace(g.Location),
		"start": map[string]string{
			"dateTime": start.Format(time.RFC3339),
			"timeZone": timezone,
		},
		"end": map[string]string{
			"dateTime": end.Format(time.RFC3339),
			"timeZone": timezone,
		},
		"attendees": attendees,
		"reminders": reminders,
		"conferenceData": nil,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=0", bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var out map[string]interface{}
	if err := json.Unmarshal(respBody, &out); err != nil {
		return "", err
	}
	htmlLink, _ := out["htmlLink"].(string)
	return strings.TrimSpace(htmlLink), nil
}

func stripGoogleMeetArtifacts(g *geminiCalendarExtract) *geminiCalendarExtract {
	if g == nil {
		return &geminiCalendarExtract{}
	}

	meetURLPattern := regexp.MustCompile(`https?://meet\.google\.com/[A-Za-z0-9\-]+`)
	meetWordPattern := regexp.MustCompile(`(?i)\b(google\s*meet|gmeet|meet\.google\.com)\b`)
	clean := *g
	clean.Description = strings.TrimSpace(meetURLPattern.ReplaceAllString(clean.Description, ""))
	clean.Location = strings.TrimSpace(meetURLPattern.ReplaceAllString(clean.Location, ""))
	clean.Description = strings.TrimSpace(meetWordPattern.ReplaceAllString(clean.Description, ""))
	clean.Location = strings.TrimSpace(meetWordPattern.ReplaceAllString(clean.Location, ""))

	clean.Description = strings.TrimSpace(strings.Join(strings.Fields(clean.Description), " "))
	clean.Location = strings.TrimSpace(strings.Join(strings.Fields(clean.Location), " "))
	return &clean
}

func parseAndValidateEmails(raw string) ([]string, error) {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	seen := map[string]struct{}{}

	for _, p := range parts {
		email := strings.TrimSpace(p)
		if email == "" {
			continue
		}
		if _, err := mail.ParseAddress(email); err != nil {
			return nil, fmt.Errorf("Email tidak valid: %s", email)
		}
		key := strings.ToLower(email)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, email)
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("Minimal 1 email valid wajib diisi")
	}
	return result, nil
}

func geminiExtractCalendarData(prompt, timezone, apiKey string) (*geminiCalendarExtract, error) {
	now := time.Now().Format(time.RFC3339)
	instruction := fmt.Sprintf("Kamu adalah asisten pembuat event kalender. Ubah perintah user menjadi JSON VALID TANPA teks lain dengan schema ini: {\"title\":\"...\",\"description\":\"...\",\"location\":\"...\",\"start_datetime\":\"RFC3339\",\"end_datetime\":\"RFC3339\",\"timezone\":\"...\"}. Gunakan timezone %s. Waktu sekarang: %s. Jika jam tidak ada, default 09:00-10:00. Jangan kosongkan title.", timezone, now)
	fullPrompt := instruction + "\nPerintah user: " + prompt

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": fullPrompt}}},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.1,
			"maxOutputTokens": 300,
		},
	}
	body, _ := json.Marshal(payload)

	modelsToTry := listGeminiGenerateModels(apiKey)
	if len(modelsToTry) == 0 {
		modelsToTry = []string{
			"models/gemini-2.0-flash",
			"models/gemini-1.5-flash",
			"models/gemini-1.5-flash-latest",
			"models/gemini-1.5-pro",
		}
	}

	var out map[string]interface{}
	var lastErr error
	for _, modelName := range modelsToTry {
		urlGemini := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/%s:generateContent?key=%s", strings.TrimPrefix(modelName, "/"), apiKey)
		req, err := http.NewRequest(http.MethodPost, urlGemini, bytes.NewBuffer(body))
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		respBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode >= 300 {
			lastErr = fmt.Errorf("model %s status %d: %s", modelName, resp.StatusCode, strings.TrimSpace(string(respBytes)))
			continue
		}

		if err := json.Unmarshal(respBytes, &out); err != nil {
			lastErr = err
			continue
		}

		lastErr = nil
		break
	}

	if lastErr != nil {
		return nil, lastErr
	}

	text := extractGeminiText(out)
	if strings.TrimSpace(text) == "" {
		return nil, fmt.Errorf("respons Gemini kosong")
	}

	var parsed geminiCalendarExtract
	if err := parseGeminiCalendarJSON(text, &parsed); err != nil {
		parsed = fallbackCalendarExtract(prompt, timezone)
	}
	if strings.TrimSpace(parsed.Title) == "" {
		parsed.Title = "Event Desk Help"
	}
	if strings.TrimSpace(parsed.Timezone) == "" {
		parsed.Timezone = timezone
	}
	return &parsed, nil
}

func listGeminiGenerateModels(apiKey string) []string {
	urlModels := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models?key=%s", apiKey)
	resp, err := http.Get(urlModels)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil
	}

	modelsRaw, ok := payload["models"].([]interface{})
	if !ok {
		return nil
	}

	preferred := make([]string, 0)
	others := make([]string, 0)
	for _, item := range modelsRaw {
		m, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := m["name"].(string)
		if !strings.HasPrefix(name, "models/") {
			continue
		}

		supported, _ := m["supportedGenerationMethods"].([]interface{})
		canGenerate := false
		for _, meth := range supported {
			if s, ok := meth.(string); ok && s == "generateContent" {
				canGenerate = true
				break
			}
		}
		if !canGenerate {
			continue
		}

		lower := strings.ToLower(name)
		if strings.Contains(lower, "1.5") || strings.Contains(lower, "2.0") {
			continue
		}
		if strings.Contains(lower, "tts") || strings.Contains(lower, "audio") || strings.Contains(lower, "image") || strings.Contains(lower, "embedding") {
			continue
		}
		if strings.Contains(lower, "flash") {
			preferred = append(preferred, name)
		} else {
			others = append(others, name)
		}
	}

	return append(preferred, others...)
}

func extractJSONObject(s string) string {
	re := regexp.MustCompile(`\{[\s\S]*\}`)
	m := re.FindString(s)
	return strings.TrimSpace(m)
}

func stripMarkdownFence(s string) string {
	cleaned := strings.TrimSpace(s)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	return strings.TrimSpace(cleaned)
}

func parseGeminiCalendarJSON(text string, out *geminiCalendarExtract) error {
	candidates := []string{}

	raw := strings.TrimSpace(text)
	if raw != "" {
		candidates = append(candidates, raw)
	}

	withoutFence := stripMarkdownFence(raw)
	if withoutFence != "" && withoutFence != raw {
		candidates = append(candidates, withoutFence)
	}

	objRaw := extractJSONObject(raw)
	if objRaw != "" {
		candidates = append(candidates, objRaw)
	}

	objNoFence := extractJSONObject(withoutFence)
	if objNoFence != "" && objNoFence != objRaw {
		candidates = append(candidates, objNoFence)
	}

	var lastErr error
	seen := map[string]struct{}{}
	for _, c := range candidates {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}
		if _, ok := seen[c]; ok {
			continue
		}
		seen[c] = struct{}{}

		if err := json.Unmarshal([]byte(c), out); err == nil {
			return nil
		} else {
			lastErr = err
		}
	}

	if lastErr != nil {
		return fmt.Errorf("format respons Gemini tidak valid: %w", lastErr)
	}
	return fmt.Errorf("respons Gemini tidak mengandung JSON yang bisa diparse")
}

func fallbackCalendarExtract(prompt, timezone string) geminiCalendarExtract {
	p := strings.TrimSpace(prompt)
	if p == "" {
		p = "Event Desk Help"
	}

	title := p
	if len(title) > 80 {
		title = title[:80]
	}

	return geminiCalendarExtract{
		Title:       title,
		Description: p,
		Location:    "",
		Start:       "",
		End:         "",
		Timezone:    timezone,
	}
}

func normalizeTimes(g *geminiCalendarExtract, loc *time.Location, eventDate, startClock, endClock string) (time.Time, time.Time) {
	if strings.TrimSpace(eventDate) != "" {
		startH, startM := 9, 0
		if strings.TrimSpace(startClock) != "" {
			if t, err := time.Parse("15:04", startClock); err == nil {
				startH, startM = t.Hour(), t.Minute()
			}
		}

		eventDay, err := time.ParseInLocation("2006-01-02", eventDate, loc)
		if err == nil {
			start := time.Date(eventDay.Year(), eventDay.Month(), eventDay.Day(), startH, startM, 0, 0, loc)
			end := start.Add(1 * time.Hour)
			if strings.TrimSpace(endClock) != "" {
				if et, eErr := time.Parse("15:04", endClock); eErr == nil {
					customEnd := time.Date(eventDay.Year(), eventDay.Month(), eventDay.Day(), et.Hour(), et.Minute(), 0, 0, loc)
					if customEnd.After(start) {
						end = customEnd
					}
				}
			}
			return start, end
		}
	}

	start, err := time.Parse(time.RFC3339, strings.TrimSpace(g.Start))
	if err != nil {
		start = time.Now().In(loc).Add(24 * time.Hour)
		start = time.Date(start.Year(), start.Month(), start.Day(), 9, 0, 0, 0, loc)
	}

	end, err := time.Parse(time.RFC3339, strings.TrimSpace(g.End))
	if err != nil || !end.After(start) {
		end = start.Add(1 * time.Hour)
	}
	return start, end
}

func buildGoogleCalendarURL(g *geminiCalendarExtract, emails []string, start, end time.Time, timezone string) string {
	params := url.Values{}
	params.Set("action", "TEMPLATE")
	params.Set("text", strings.TrimSpace(g.Title))
	params.Set("details", strings.TrimSpace(g.Description))
	params.Set("location", strings.TrimSpace(g.Location))
	params.Set("ctz", timezone)
	params.Set("dates", fmt.Sprintf("%s/%s", start.UTC().Format("20060102T150405Z"), end.UTC().Format("20060102T150405Z")))
	if len(emails) > 0 {
		params.Set("add", strings.Join(emails, ","))
	}
	return "https://calendar.google.com/calendar/render?" + params.Encode()
}
