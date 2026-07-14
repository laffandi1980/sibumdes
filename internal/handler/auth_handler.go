package handler

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Message string       `json:"message"`
	User    *models.User `json:"user,omitempty"`
	Token   string       `json:"token,omitempty"` // we will just use slug as lightweight token
}

type loginAttemptState struct {
	Count        int
	LastAttempt  time.Time
	BlockedUntil time.Time
}

var (
	loginAttemptsMu sync.Mutex
	loginAttempts   = map[string]loginAttemptState{}
)

const (
	maxLoginAttempts = 8
	blockDuration    = 5 * time.Minute
	attemptTTL       = 30 * time.Minute
)

func resolveClientIP(r *http.Request) string {
	forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	if strings.TrimSpace(r.RemoteAddr) != "" {
		return strings.TrimSpace(r.RemoteAddr)
	}
	return "unknown"
}

func isLoginBlocked(clientKey string) bool {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()

	now := time.Now()
	for k, v := range loginAttempts {
		if now.Sub(v.LastAttempt) > attemptTTL && now.After(v.BlockedUntil) {
			delete(loginAttempts, k)
		}
	}

	state, ok := loginAttempts[clientKey]
	if !ok {
		return false
	}
	return now.Before(state.BlockedUntil)
}

func registerFailedLogin(clientKey string) {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()

	now := time.Now()
	state := loginAttempts[clientKey]
	state.Count++
	state.LastAttempt = now
	if state.Count >= maxLoginAttempts {
		state.BlockedUntil = now.Add(blockDuration)
	}
	loginAttempts[clientKey] = state
}

func clearFailedLogin(clientKey string) {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()
	delete(loginAttempts, clientKey)
}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clientKey := resolveClientIP(r)
	if isLoginBlocked(clientKey) {
		http.Error(w, "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.", http.StatusTooManyRequests)
		return
	}

	var input LoginRequest
	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Format login tidak valid", http.StatusBadRequest)
			return
		}
	} else {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "Gagal membaca data login", http.StatusBadRequest)
			return
		}
		input.Username = r.FormValue("username")
		input.Password = r.FormValue("password")
	}

	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)

	if input.Username == "" || input.Password == "" {
		http.Error(w, "Username dan password tidak boleh kosong", http.StatusBadRequest)
		return
	}

	var user models.User
	// Search in DB (Assuming 'Nama' represents the username here as agreed)
	err := config.DB.Preload("Role").Preload("ProfileBUMDes").Where("nama = ?", input.Username).First(&user).Error
	if err != nil {
		registerFailedLogin(clientKey)
		http.Error(w, "Kredensial tidak valid", http.StatusUnauthorized)
		return
	}

	if !service.VerifyPassword(user.Password, input.Password) {
		registerFailedLogin(clientKey)
		http.Error(w, "Kredensial tidak valid", http.StatusUnauthorized)
		return
	}

	// Auto-upgrade akun lama yang masih plain-text ke bcrypt.
	if !service.IsBcryptHash(user.Password) {
		if hashed, err := service.HashPassword(input.Password); err == nil {
			_ = config.DB.Model(&models.User{}).Where("id = ?", user.ID).Update("password", hashed).Error
		}
	}

	clearFailedLogin(clientKey)

	// Security: Do not expose password back to the client
	user.Password = ""

	resp := LoginResponse{
		Message: "Login Berhasil",
		User:    &user,
		Token:   user.Slug,
	}

	if !strings.Contains(contentType, "application/json") {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)

		payload, _ := json.Marshal(resp)
		_, _ = fmt.Fprintf(w, `<!doctype html>
<html lang="id">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Login Berhasil</title>
</head>
<body>
<script>
(function () {
	const data = %s;
	localStorage.setItem('sibumdes_auth', data.token);
	localStorage.setItem('sibumdes_user', data.user.Nama);
	localStorage.setItem('sibumdes_role_id', String(data.user.RoleID));
	localStorage.setItem('sibumdes_role_name', data.user.Role && data.user.Role.NamaPeran ? data.user.Role.NamaPeran : 'Pengguna');

	if (data.user.ProfileBUMDesID) {
		localStorage.setItem('sibumdes_profile_id', String(data.user.ProfileBUMDesID));
	} else {
		localStorage.removeItem('sibumdes_profile_id');
	}

	if (data.user.ProfileBUMDes && data.user.ProfileBUMDes.NamaBUMDes) {
		localStorage.setItem('sibumdes_profile_name', data.user.ProfileBUMDes.NamaBUMDes);
	} else {
		localStorage.removeItem('sibumdes_profile_name');
	}

	window.location.replace('/');
})();
</script>
</body>
</html>`, payload)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
