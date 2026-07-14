package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func GetBarangJasas(w http.ResponseWriter, r *http.Request) {
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

	data, err := service.GetAllBarangJasa(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching barang jasa", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func GetBarangJasa(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	obj, err := service.GetBarangJasaBySlug(slug)
	if err != nil {
		http.Error(w, "Error fetching barang jasa", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj)
}

func SaveBarangJasa(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	slug := r.FormValue("slug")
	var existing *models.BarangJasa
	if slug != "" {
		bj, err := service.GetBarangJasaBySlug(slug)
		if err == nil && bj.ID > 0 {
			existing = bj
		}
	}
	if existing == nil {
		existing = &models.BarangJasa{}
	}

	unitIDStr := r.FormValue("unit_usaha_id")
	var unitIDPtr *uint
	if unitIDStr != "" {
		if u, err := strconv.ParseUint(unitIDStr, 10, 32); err == nil {
			val := uint(u)
			unitIDPtr = &val
		}
	}
	existing.UnitUsahaID = unitIDPtr

	profileIDStr := r.FormValue("profile_bumdes_id")
	if profileIDStr != "" {
		if pid, err := strconv.ParseUint(profileIDStr, 10, 32); err == nil {
			val := uint(pid)
			existing.ProfileBUMDesID = &val
		} else {
			existing.ProfileBUMDesID = nil
		}
	} else {
		existing.ProfileBUMDesID = nil
	}

	existing.KodeBarangJasa = strings.TrimSpace(r.FormValue("kode_barang_jasa"))
	existing.NamaBarangJasa = strings.TrimSpace(r.FormValue("nama_barang_jasa"))
	existing.Jenis = strings.TrimSpace(r.FormValue("jenis"))
	existing.Satuan = strings.TrimSpace(r.FormValue("satuan"))

	if hbaStr := r.FormValue("harga_beli_awal"); hbaStr != "" {
		if hba, err := strconv.ParseFloat(hbaStr, 64); err == nil {
			existing.HargaBeliAwal = hba
		}
	}
	if hjStr := r.FormValue("harga_jual"); hjStr != "" {
		if hj, err := strconv.ParseFloat(hjStr, 64); err == nil {
			existing.HargaJual = hj
		}
	}

	if err := service.SaveBarangJasa(existing); err != nil {
		http.Error(w, "Error saving barang jasa: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Barang/Jasa saved successfully"))
}

func DeleteBarangJasa(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	if err := service.DeleteBarangJasaBySlug(slug); err != nil {
		http.Error(w, "Error deleting barang jasa", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Barang/Jasa deleted successfully"))
}
