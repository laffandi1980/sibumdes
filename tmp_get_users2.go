package main

import (
	"fmt"
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func main() {
	config.ConnectDatabase()
	var users []models.User
	if err := config.DB.Find(&users).Error; err != nil {
		fmt.Println("Error:", err)
		return
	}
	for _, u := range users {
		var profileBumdesID string
		if u.ProfileBUMDesID == nil {
			profileBumdesID = "NULL"
		} else {
			profileBumdesID = fmt.Sprintf("%d", *u.ProfileBUMDesID)
		}
		fmt.Printf("ID: %d | Nama: %s | Slug: %s | ProfileID: %s\n", u.ID, u.Nama, u.Slug, profileBumdesID)
	}
}
