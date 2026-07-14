package models

import (
	"time"
)

type Barang struct {
	ID               uint          `gorm:"primaryKey" json:"id"`
	Slug             string        `gorm:"type:char(36);uniqueIndex" json:"slug"`
	KodeBarang       string        `gorm:"type:varchar(50);unique;not null" json:"kode_barang"`
	ProfileBUMDesID  *uint         `gorm:"index" json:"profile_bumdes_id"`
	ProfileBUMDes    ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID" json:"profile_bumdes"`
	UnitUsahaID      *uint         `gorm:"index" json:"unit_usaha_id"`
	UnitUsaha        UnitUsaha     `gorm:"foreignKey:UnitUsahaID" json:"unit_usaha"`
	NamaBarang       string        `gorm:"type:varchar(150);not null" json:"nama_barang"`
	MerkBarang       string        `gorm:"type:varchar(100);not null" json:"merk_barang"`
	HargaBeliAwal    float64       `gorm:"type:decimal(15,2);default:0" json:"harga_beli_awal"`
	HargaJual        float64       `gorm:"type:decimal(15,2);default:0" json:"harga_jual"`
	Satuan           string        `gorm:"type:varchar(50);not null" json:"satuan"`
	SaldoAwalQty     float64       `gorm:"type:decimal(15,2);default:0" json:"saldo_awal_qty"`
	SaldoAwalNominal int64         `gorm:"type:bigint;default:0" json:"saldo_awal_nominal"`
	Status           string        `gorm:"type:varchar(20);default:'Aktif'" json:"status"`
	KartuPersediaan  bool          `gorm:"default:false" json:"kartu_persediaan"`
	LinkAkun         string        `gorm:"type:text" json:"link_akun"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
}
