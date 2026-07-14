package handler

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"sibumdes/internal/models"
	"sibumdes/internal/service"
)

func resolveProfileAccess(r *http.Request) (*uint, error) {
	sessionSlug := strings.TrimSpace(r.URL.Query().Get("session_slug"))
	if sessionSlug == "" {
		sessionSlug = strings.TrimSpace(r.FormValue("session_slug"))
	}
	if sessionSlug == "" {
		return nil, nil
	}

	loggedUser, err := service.GetUserBySlug(sessionSlug)
	if err != nil || loggedUser == nil {
		return nil, errors.New("invalid session")
	}

	roleName := strings.ToLower(strings.TrimSpace(loggedUser.Role.NamaPeran))
	isPengembang := strings.Contains(roleName, "pengembang")
	if isPengembang {
		return nil, nil
	}

	if loggedUser.ProfileBUMDesID == nil || *loggedUser.ProfileBUMDesID == 0 {
		return nil, errors.New("user tidak terhubung ke profile BUMDes")
	}

	return loggedUser.ProfileBUMDesID, nil
}

func GetProfiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	reqProfileID, accessErr := resolveProfileAccess(r)
	if accessErr != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profiles, err := service.GetAllProfiles(reqProfileID)
	if err != nil {
		http.Error(w, "Error fetching profiles", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profiles)
}

func GetProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	slug := r.URL.Query().Get("slug")
	reqProfileID, accessErr := resolveProfileAccess(r)
	if accessErr != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var profile *models.ProfileBUMDes
	var err error

	if slug != "" {
		profile, err = service.GetProfileBySlug(slug, reqProfileID)
	} else if idStr != "" {
		id, parseErr := strconv.ParseUint(idStr, 10, 32)
		if parseErr != nil {
			http.Error(w, "Invalid ID", http.StatusBadRequest)
			return
		}
		profile, err = service.GetProfileByID(uint(id), reqProfileID)
	} else {
		http.Error(w, "ID or slug is required", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, "Error fetching profile", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

func DeleteProfile(w http.ResponseWriter, r *http.Request) {
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

	reqProfileID, accessErr := resolveProfileAccess(r)
	if accessErr != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	err = service.DeleteProfile(uint(id), reqProfileID)
	if err != nil {
		http.Error(w, "Error deleting profile", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Profile deleted successfully"))
}

func DeleteUnitUsaha(w http.ResponseWriter, r *http.Request) {
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

	err = service.DeleteUnitUsaha(uint(id))
	if err != nil {
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "foreign key constraint fails") || strings.Contains(errMsg, "error 1451") {
			http.Error(w, "Unit usaha tidak bisa dihapus karena masih dipakai data lain (mis. pelanggan/transaksi).", http.StatusConflict)
			return
		}
		http.Error(w, "Gagal menghapus unit usaha: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Unit usaha deleted successfully"))
}

func parseTimeField(dateStr string) *time.Time {
	if dateStr == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil
	}
	return &t
}

func generateUUIDv4() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func SaveProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 10 MB Max memory
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	reqProfileID, accessErr := resolveProfileAccess(r)
	if accessErr != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	idStr := r.FormValue("id")
	slugForm := r.FormValue("slug")
	var profileID uint = 0
	logoPath := ""
	slugVal := generateUUIDv4()

	if reqProfileID != nil {
		lockedProfile, lockErr := service.GetProfileByID(*reqProfileID, reqProfileID)
		if lockErr != nil || lockedProfile == nil || lockedProfile.ID == 0 {
			http.Error(w, "Profile login tidak ditemukan", http.StatusForbidden)
			return
		}

		profileID = lockedProfile.ID
		logoPath = lockedProfile.LogoPath
		if lockedProfile.Slug != "" {
			slugVal = lockedProfile.Slug
		}
	} else {
		if idStr != "" {
			id, err := strconv.ParseUint(idStr, 10, 32)
			if err == nil && id > 0 {
				profileID = uint(id)
				existingProfile, _ := service.GetProfileByID(profileID, nil)
				if existingProfile != nil {
					logoPath = existingProfile.LogoPath
					if existingProfile.Slug != "" {
						slugVal = existingProfile.Slug
					}
				}
			}
		}

		if profileID == 0 && slugForm != "" {
			existingProfile, _ := service.GetProfileBySlug(slugForm, nil)
			if existingProfile != nil && existingProfile.ID > 0 {
				profileID = existingProfile.ID
				logoPath = existingProfile.LogoPath
				slugVal = existingProfile.Slug
			}
		}
	}

	// Handle File Upload
	file, handler, err := r.FormFile("logo")
	if err == nil {
		defer file.Close()

		uploadDir := "./frontend/assets/uploads"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			http.Error(w, "Unable to create directories", http.StatusInternalServerError)
			return
		}

		// Create unique filename
		ext := filepath.Ext(handler.Filename)
		filename := fmt.Sprintf("logo_%d%s", time.Now().Unix(), ext)
		dstPath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(dstPath)
		if err != nil {
			http.Error(w, "Unable to save file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()
		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, "Unable to copy file", http.StatusInternalServerError)
			return
		}
		// Save the relative path for web access
		logoPath = "/assets/uploads/" + filename
	}

	// Map text fields
	namaBUMDes := r.FormValue("nama_bumdes")
	profile := models.ProfileBUMDes{
		ID:                    profileID,
		NamaBUMDes:            namaBUMDes,
		Slug:                  slugVal,
		AlamatLengkap:         r.FormValue("alamat_lengkap"),
		NomorTelepon:          r.FormValue("nomor_telepon"),
		NomorIzinUsaha:        r.FormValue("nomor_izin_usaha"),
		Visi:                  r.FormValue("visi"),
		Misi:                  r.FormValue("misi"),
		NamaKetuaBUMDes:       r.FormValue("nama_ketua_bumdes"),
		SekretarisBUMDes:      r.FormValue("sekretaris_bumdes"),
		BendaharaBUMDes:       r.FormValue("bendahara_bumdes"),
		PendampingBUMDes:      r.FormValue("pendamping_bumdes"),
		PengawasBUMDes:        r.FormValue("pengawas_bumdes"),
		LogoPath:              logoPath,
		TanggalAwalPembukuan:  parseTimeField(r.FormValue("tanggal_awal_pembukuan")),
		TanggalAkhirPembukuan: parseTimeField(r.FormValue("tanggal_akhir_pembukuan")),
	}

	// Map Unit Usaha if name is provided (Arrays)
	r.ParseForm()
	unitUsahaIDs := r.PostForm["unit_usaha_id[]"]
	namaUnitUsahas := r.PostForm["nama_unit_usaha[]"]
	bidangUsahas := r.PostForm["bidang_usaha[]"]
	penanggungJawabs := r.PostForm["penanggung_jawab[]"]
	mataUangs := r.PostForm["mata_uang[]"]
	tanggalDaftars := r.PostForm["tanggal_daftar[]"]
	statusUnits := r.PostForm["status_unit[]"]

	if len(namaUnitUsahas) > 0 {
		for i, namaUnit := range namaUnitUsahas {
			if namaUnit == "" {
				continue
			}

			unitID := uint(0)
			if i < len(unitUsahaIDs) && unitUsahaIDs[i] != "" {
				parsedID, parseErr := strconv.ParseUint(unitUsahaIDs[i], 10, 32)
				if parseErr == nil {
					unitID = uint(parsedID)
				}
			}

			bidang := ""
			if i < len(bidangUsahas) {
				bidang = bidangUsahas[i]
			}

			pj := ""
			if i < len(penanggungJawabs) {
				pj = penanggungJawabs[i]
			}

			mu := "Rp"
			if i < len(mataUangs) && mataUangs[i] != "" {
				mu = mataUangs[i]
			}

			tglDaftar := parseTimeField("")
			if i < len(tanggalDaftars) {
				tglDaftar = parseTimeField(tanggalDaftars[i])
			}

			status := "Aktif"
			if i < len(statusUnits) && statusUnits[i] != "" {
				status = statusUnits[i]
			}

			unit := models.UnitUsaha{
				ID:              unitID,
				NamaUnitUsaha:   namaUnit,
				BidangUsaha:     bidang,
				PenanggungJawab: pj,
				MataUang:        mu,
				TanggalDaftar:   tglDaftar,
				Status:          status,
			}
			profile.UnitUsaha = append(profile.UnitUsaha, unit)
		}
	}

	err = service.SaveProfile(&profile)
	if err != nil {
		fmt.Println("Error saving:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Profile saved successfully"))
}
