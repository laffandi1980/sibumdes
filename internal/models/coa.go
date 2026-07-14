package models

import "time"

type ChartOfAccount struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	Slug            string        `gorm:"type:char(36);uniqueIndex" json:"slug"`
	ProfileBUMDesID *uint         `gorm:"column:profile_bum_des_id;index" json:"profile_bumdes_id"`
	ProfileBUMDes   ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID" json:"profile_bumdes"`
	Kelompok        string        `gorm:"type:varchar(100);not null" json:"kelompok"`
	StatusAkun      string        `gorm:"type:varchar(20);not null" json:"status_akun"`
	LevelAkun       int           `gorm:"not null;default:1" json:"level_akun"`
	KodeAkun        string        `gorm:"type:varchar(50);not null;index" json:"kode_akun"`
	KodeParent      string        `gorm:"type:varchar(50)" json:"kode_parent"`
	NamaAkun        string        `gorm:"type:varchar(150);not null" json:"nama_akun"`
	SaldoNormal     string        `gorm:"type:varchar(10);not null;default:'Debit'" json:"saldo_normal"`
	Catatan         string        `gorm:"type:text" json:"catatan"`
	DisplayOrder    int           `gorm:"not null;default:0;index" json:"display_order"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}
