package models

import (
	"time"
)

type Supplier struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	Slug            string        `gorm:"type:char(36);uniqueIndex" json:"slug"`
	KodeSupplier    string        `gorm:"type:varchar(50);unique;not null" json:"kode_supplier"`
	ProfileBUMDesID *uint         `gorm:"index" json:"profile_bumdes_id"`
	ProfileBUMDes   ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID" json:"profile_bumdes"`
	UnitUsahaID     *uint         `gorm:"index" json:"unit_usaha_id"`
	UnitUsaha       UnitUsaha     `gorm:"foreignKey:UnitUsahaID" json:"unit_usaha"`
	NamaSupplier    string        `gorm:"type:varchar(150);not null" json:"nama_supplier"`
	BidangSupply    string        `gorm:"type:varchar(150)" json:"bidang_supply"`
	Alamat          string        `gorm:"type:text" json:"alamat"`
	NoTelepon       string        `gorm:"type:varchar(20);not null" json:"no_telepon"`
	Status          string        `gorm:"type:varchar(20);default:'Aktif'" json:"status"`
	SaldoAwal       int64         `gorm:"type:bigint;default:0" json:"saldo_awal"`
	BkPembantuUtang bool          `gorm:"default:false" json:"bk_pembantu_utang"`
	LinkAkun        string        `gorm:"type:varchar(150)" json:"link_akun"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}
