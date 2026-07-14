package models

import "time"

type BarangJasa struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	Slug            string        `gorm:"type:char(36);uniqueIndex" json:"slug"`
	KodeBarangJasa  string        `gorm:"type:varchar(50);unique;not null" json:"kode_barang_jasa"`
	ProfileBUMDesID *uint         `gorm:"index" json:"profile_bumdes_id"`
	ProfileBUMDes   ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID" json:"profile_bumdes"`
	UnitUsahaID     *uint         `gorm:"index" json:"unit_usaha_id"`
	UnitUsaha       UnitUsaha     `gorm:"foreignKey:UnitUsahaID" json:"unit_usaha"`
	NamaBarangJasa  string        `gorm:"type:varchar(150);not null" json:"nama_barang_jasa"`
	Jenis           string        `gorm:"type:varchar(20);not null" json:"jenis"`
	Satuan          string        `gorm:"type:varchar(50);not null" json:"satuan"`
	HargaBeliAwal   float64       `gorm:"type:decimal(15,2);default:0" json:"harga_beli_awal"`
	HargaJual       float64       `gorm:"type:decimal(15,2);default:0" json:"harga_jual"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}
