package config

import (
	"fmt"
	"log"
	"os"
	"sibumdes/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// DSN format: [username[:password]@][protocol[(address)]]/dbname[?param1=value1&...&paramN=valueN]
	// Priority:
	// 1) MYSQL_DSN (full DSN)
	// 2) DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME
	// 3) local defaults
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dbUser := getEnv("DB_USER", "root")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbHost := getEnv("DB_HOST", "127.0.0.1")
		dbPort := getEnv("DB_PORT", "3306")
		dbName := getEnv("DB_NAME", "sibumdes")

		dsn = fmt.Sprintf(
			"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			dbUser,
			dbPassword,
			dbHost,
			dbPort,
			dbName,
		)
	}
	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Println("WARNING: Failed to connect to MySQL database.")
		log.Println("Tip: set MYSQL_DSN or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME in .env")
		log.Println("Error:", err)
		return
	}

	err = database.AutoMigrate(&models.ProfileBUMDes{}, &models.UnitUsaha{}, &models.Role{}, &models.User{}, &models.Pelanggan{}, &models.Supplier{}, &models.Barang{}, &models.BarangJasa{}, &models.Transaksi{}, &models.MappingTransaksi{}, &models.MappingTransaksiDetail{}, &models.Inventaris{}, &models.ChartOfAccount{}, &models.SaldoAwalReport{}, &models.KartuPersediaanManual{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	DB = database // Must assign first so seedRoles can use it

	// Seeding Initial Defaults for Roles if Empty
	seedRoles()

	log.Println("Database connection established and migrated successfully.")
}

func seedRoles() {
	var count int64
	DB.Model(&models.Role{}).Count(&count)
	if count == 0 {
		defaultRoles := []models.Role{
			{
				NamaPeran:         "Super Admin",
				DeskripsiHakAkses: "Akses penuh seluruh menu dan konfigurasi (bisa impersonate ke seluruh tampilan user)\nManajemen user\nPengaturan bagan akun\nPengaturan periode akuntansi\nAkses seluruh unit usaha",
			},
			{
				NamaPeran:         "Admin BUMDes",
				DeskripsiHakAkses: "Manajemen user\nPengaturan periode akuntansi\nAkses seluruh unit usaha",
			},
			{
				NamaPeran:         "Operator Data Transaksi",
				DeskripsiHakAkses: "Input transaksi kas\nAkses laporan keuangan dan analisis\nTidak memiliki hak edit laporan\nBisa Export Laporan Excel/pdf\nTampilan dibatasi sesuai unit usaha yang ditangani",
			},
			{
				NamaPeran:         "Pengelola / Pengawas BUMDes",
				DeskripsiHakAkses: "Akses laporan dan dashboard\nTidak memiliki hak input atau edit data",
			},
		}

		if err := DB.Create(&defaultRoles).Error; err != nil {
			log.Println("Failed to seed default roles:", err)
		} else {
			log.Println("Successfully seeded 4 default Hak Akses roles.")
		}
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
