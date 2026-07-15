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
	var roles []models.Role
	config.DB.Find(&roles)
	for _, r := range roles {
		fmt.Printf("ID: %d | NamaPeran: %s\n", r.ID, r.NamaPeran)
	}
}
