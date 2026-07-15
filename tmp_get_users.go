//go:build ignore
// +build ignore

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
	fmt.Printf("%-5s | %-20s | %-20s\n", "ID", "Nama Pengguna", "Password")
	fmt.Println("-----------------------------------------------------")
	for _, u := range users {
		fmt.Printf("%-5d | %-20s | %-20s\n", u.ID, u.Nama, u.Password)
	}
}
