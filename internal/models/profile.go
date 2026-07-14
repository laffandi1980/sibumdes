package models

import (
	"time"
)

type ProfileBUMDes struct {
	ID                    uint   `gorm:"primaryKey"`
	NamaBUMDes            string `gorm:"type:varchar(255);not null"`
	Slug                  string `gorm:"type:varchar(255);uniqueIndex"`
	AlamatLengkap         string `gorm:"type:text"`
	NomorTelepon          string `gorm:"type:varchar(20)"`
	NomorIzinUsaha        string `gorm:"type:varchar(100)"`
	LogoPath              string `gorm:"type:varchar(255)"`
	Visi                  string `gorm:"type:text"`
	Misi                  string `gorm:"type:text"`
	NamaKetuaBUMDes       string `gorm:"type:varchar(100)"`
	SekretarisBUMDes      string `gorm:"type:varchar(100)"`
	BendaharaBUMDes       string `gorm:"type:varchar(100)"`
	PendampingBUMDes      string `gorm:"type:varchar(100)"`
	PengawasBUMDes        string `gorm:"type:varchar(100)"`
	TanggalAwalPembukuan  *time.Time
	TanggalAkhirPembukuan *time.Time
	UnitUsaha             []UnitUsaha `gorm:"foreignKey:ProfileID"`
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type UnitUsaha struct {
	ID              uint   `gorm:"primaryKey"`
	ProfileID       uint   `gorm:"index"`
	NamaUnitUsaha   string `gorm:"type:varchar(255);not null"`
	BidangUsaha     string `gorm:"type:varchar(255)"`
	PenanggungJawab string `gorm:"type:varchar(100)"`
	MataUang        string `gorm:"type:varchar(10);default:'Rp'"`
	TanggalDaftar   *time.Time
	Status          string `gorm:"type:varchar(50)"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
