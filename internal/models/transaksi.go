package models

import (
	"time"
)

type Transaksi struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	UnitUsahaID          uint           `gorm:"column:unit_usaha_id;index;not null" json:"unit_usaha_id"`
	ProfileBUMDesID      uint           `gorm:"column:profile_bum_des_id;index;not null" json:"profile_bumdes_id"`
	Tanggal              time.Time      `gorm:"type:date;not null" json:"tanggal"`
	NamaPelangganPemasok string         `gorm:"type:varchar(255)" json:"nama_pelanggan_pemasok"`
	Keterangan           string         `gorm:"type:text" json:"keterangan"`
	Deskripsi            string         `gorm:"type:text" json:"deskripsi"`
	MappingSlug          string         `gorm:"type:char(36);index" json:"mapping_slug"`
	MappingJenis         string         `gorm:"type:varchar(30);index" json:"mapping_jenis"`
	AkunDebet            string         `gorm:"type:varchar(255)" json:"akun_debet"`
	AkunKredit           string         `gorm:"type:varchar(255)" json:"akun_kredit"`
	Validasi             string         `gorm:"type:varchar(20);default:'Belum';not null" json:"validasi"`
	Nominal              float64        `gorm:"type:decimal(15,2);not null" json:"nominal"`
	TipeKas              string         `gorm:"type:enum('tambah', 'kurang');not null" json:"tipe_kas"`
	StatusBayar          string         `gorm:"type:enum('tunai','kredit');default:tunai;not null" json:"status_bayar"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	UnitUsaha            *UnitUsaha     `gorm:"foreignKey:UnitUsahaID;references:ID" json:"unit_usaha,omitempty"`
	ProfileBUMDes        *ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID;references:ID" json:"profile_bumdes,omitempty"`
}
