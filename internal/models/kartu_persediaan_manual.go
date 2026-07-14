package models

import "time"

type KartuPersediaanManual struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	ProfileBUMDesID *uint     `gorm:"index" json:"profile_bumdes_id"`
	UnitUsahaID     uint      `gorm:"index;not null" json:"unit_usaha_id"`
	BarangSlug      string    `gorm:"type:char(36);index;not null" json:"barang_slug"`
	Tanggal         time.Time `gorm:"type:date;not null" json:"tanggal"`
	Jenis           string    `gorm:"type:varchar(10);not null" json:"jenis"`
	Deskripsi       string    `gorm:"type:varchar(255);not null" json:"deskripsi"`
	Qty             float64   `gorm:"type:decimal(15,2);default:0" json:"qty"`
	Harga           float64   `gorm:"type:decimal(15,2);default:0" json:"harga"`
	Keterangan      string    `gorm:"type:text" json:"keterangan"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
