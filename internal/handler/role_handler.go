package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func GetRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	roles, err := service.GetAllRoles()
	if err != nil {
		http.Error(w, "Error fetching roles", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(roles)
}

func GetRole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
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

	role, err := service.GetRoleByID(uint(id))
	if err != nil {
		http.Error(w, "Error fetching role", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(role)
}

func SaveRole(w http.ResponseWriter, r *http.Request) {
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
	var roleID uint = 0

	if idStr != "" {
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err == nil && id > 0 {
			roleID = uint(id)
		}
	}

	role := models.Role{
		ID:                roleID,
		NamaPeran:         strings.TrimSpace(r.FormValue("nama_peran")),
		DeskripsiHakAkses: strings.TrimSpace(r.FormValue("deskripsi_hak_akses")),
	}

	if role.NamaPeran == "" {
		http.Error(w, "Nama peran cannot be empty", http.StatusBadRequest)
		return
	}

	err = service.SaveRole(&role)
	if err != nil {
		http.Error(w, "Error saving role: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Role saved successfully"))
}

func DeleteRole(w http.ResponseWriter, r *http.Request) {
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

	err = service.DeleteRole(uint(id))
	if err != nil {
		http.Error(w, "Error deleting role", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Role deleted successfully"))
}
