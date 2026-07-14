package models

import "time"

type Inventaris struct {
	ID                          uint          `gorm:"primaryKey" json:"id"`
	Slug                        string        `gorm:"type:char(36);uniqueIndex" json:"slug"`
	KodeAset                    string        `gorm:"type:varchar(50);unique;not null" json:"kode_aset"`
	ProfileBUMDesID             *uint         `gorm:"index" json:"profile_bumdes_id"`
	ProfileBUMDes               ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID" json:"profile_bumdes"`
	UnitUsahaID                 *uint         `gorm:"index" json:"unit_usaha_id"`
	UnitUsaha                   UnitUsaha     `gorm:"foreignKey:UnitUsahaID" json:"unit_usaha"`
	NamaAset                    string        `gorm:"type:varchar(150);not null" json:"nama_aset"`
	MerkAset                    string        `gorm:"type:varchar(100)" json:"merk_aset"`
	HargaBeli                   float64       `gorm:"type:decimal(15,2);default:0" json:"harga_beli"`
	NilaiResidu                 int64         `gorm:"type:bigint;default:0" json:"nilai_residu"`
	SaldoAwal                   int64         `gorm:"type:bigint;default:0" json:"saldo_awal"`
	LinkAkunAsetTetap           string        `gorm:"type:varchar(255)" json:"link_akun_aset_tetap"`
	AkumulasiPenyusutanAwal     int64         `gorm:"type:bigint;default:0" json:"akumulasi_penyusutan_awal"`
	LinkAkunAkumulasiPenyusutan string        `gorm:"type:varchar(255)" json:"link_akun_akumulasi_penyusutan"`
	Status                      string        `gorm:"type:varchar(50);default:'Aktif'" json:"status"`
	KartuAsetTetap              bool          `gorm:"default:true" json:"kartu_aset_tetap"`
	OngkosKirim                 float64       `gorm:"type:decimal(15,2);default:0" json:"ongkos_kirim"`
	BiayaInstalasi              float64       `gorm:"type:decimal(15,2);default:0" json:"biaya_instalasi"`
	TanggalPembelian            *time.Time    `gorm:"type:date" json:"tanggal_pembelian"`
	TanggalDigunakan            *time.Time    `gorm:"type:date" json:"tanggal_digunakan"`
	KategoriAset                string        `gorm:"type:varchar(100)" json:"kategori_aset"`
	UmurEkonomis                int           `gorm:"default:0" json:"umur_ekonomis"`
	Aktif                       bool          `gorm:"default:true" json:"aktif"`
	Satuan                      string        `gorm:"type:varchar(50)" json:"satuan"`
	CreatedAt                   time.Time     `json:"created_at"`
	UpdatedAt                   time.Time     `json:"updated_at"`
}
