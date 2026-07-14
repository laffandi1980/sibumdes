package handler

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func GetUsers(w http.ResponseWriter, r *http.Request) {
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

	users, err := service.GetAllUsers(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching users", http.StatusInternalServerError)
		return
	}
	for i := range users {
		users[i].Password = ""
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	slug := r.URL.Query().Get("slug")

	var user *models.User
	var err error

	if slug != "" {
		user, err = service.GetUserBySlug(slug)
	} else if idStr != "" {
		id, errParse := strconv.ParseUint(idStr, 10, 32)
		if errParse != nil {
			http.Error(w, "Invalid ID", http.StatusBadRequest)
			return
		}
		user, err = service.GetUserByID(uint(id))
	} else {
		http.Error(w, "ID or slug is required", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, "Error fetching user", http.StatusInternalServerError)
		return
	}
	user.Password = ""
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func generateUserUUIDv4() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return fmt.Sprintf("u-%d", time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func SaveUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	idStr := r.FormValue("id")
	roleIDStr := r.FormValue("role_id")
	profileBumdesIDStr := r.FormValue("profile_bumdes_id")

	var userID uint = 0
	var roleID uint = 0
	var profileBumdesID *uint

	if idStr != "" {
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err == nil && id > 0 {
			userID = uint(id)
		}
	}

	slugVal := generateUserUUIDv4()
	if userID > 0 {
		existingUser, _ := service.GetUserByID(userID)
		if existingUser != nil && existingUser.Slug != "" {
			slugVal = existingUser.Slug
		}
	}

	if roleIDStr != "" {
		rid, err := strconv.ParseUint(roleIDStr, 10, 32)
		if err == nil && rid > 0 {
			roleID = uint(rid)
		}
	}

	if profileBumdesIDStr != "" {
		pid, err := strconv.ParseUint(profileBumdesIDStr, 10, 32)
		if err == nil && pid > 0 {
			val := uint(pid)
			profileBumdesID = &val
		}
	}

	if roleID == 0 {
		http.Error(w, "Role tidak valid", http.StatusBadRequest)
		return
	}

	plainPassword := strings.TrimSpace(r.FormValue("password"))

	user := models.User{
		ID:              userID,
		Nama:            strings.TrimSpace(r.FormValue("nama")),
		Slug:            slugVal,
		Password:        "",
		RoleID:          roleID,
		ProfileBUMDesID: profileBumdesID,
		NIK:             strings.TrimSpace(r.FormValue("nik")),
		NoHP:            strings.TrimSpace(r.FormValue("no_hp")),
	}

	if user.Nama == "" {
		http.Error(w, "Nama wajib diisi", http.StatusBadRequest)
		return
	}

	if userID == 0 && plainPassword == "" {
		http.Error(w, "Password wajib diisi", http.StatusBadRequest)
		return
	}

	if userID > 0 {
		existingUser, _ := service.GetUserByID(userID)
		if existingUser != nil && plainPassword == "" {
			user.Password = existingUser.Password
		}
	}

	if plainPassword != "" {
		hashed, errHash := service.HashPassword(plainPassword)
		if errHash != nil {
			http.Error(w, "Gagal memproses password", http.StatusInternalServerError)
			return
		}
		user.Password = hashed
	}

	err = service.SaveUser(&user, profileBumdesID)
	if err != nil {
		http.Error(w, "Error saving user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("User saved successfully"))
}

func DeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	err = service.DeleteUser(uint(id))
	if err != nil {
		http.Error(w, "Error deleting user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("User deleted successfully"))
}
