package models

import "time"

type MappingTransaksi struct {
	ID                    uint                     `gorm:"primaryKey" json:"id"`
	Slug                  string                   `gorm:"type:char(36);uniqueIndex" json:"slug"`
	JenisMapping          string                   `gorm:"type:varchar(30);default:'harian';index" json:"jenis_mapping"`
	ProfileBUMDesID       *uint                    `gorm:"index" json:"profile_bumdes_id"`
	UnitUsahaID           *uint                    `gorm:"index" json:"unit_usaha_id"`
	NamaMapping           string                   `gorm:"type:varchar(255);not null" json:"nama_mapping"`
	KategoriTransaksi     string                   `gorm:"type:enum('masuk','keluar');not null" json:"kategori_transaksi"`
	KlasifikasiArusKas    string                   `gorm:"type:varchar(100)" json:"klasifikasi_arus_kas"`
	CashInOut             string                   `gorm:"type:varchar(50)" json:"cash_in_out"`
	KategoriArusKas       string                   `gorm:"type:varchar(255)" json:"kategori_arus_kas"`
	TipeDefault           string                   `gorm:"type:enum('tunai','kredit','semua');default:'semua'" json:"tipe_default"`
	AkunDebet             string                   `gorm:"type:varchar(255)" json:"akun_debet"`
	NominalDebet          string                   `gorm:"type:varchar(100)" json:"nominal_debet"`
	AkunKredit            string                   `gorm:"type:varchar(255)" json:"akun_kredit"`
	NominalKredit         string                   `gorm:"type:varchar(100)" json:"nominal_kredit"`
	Keterangan            string                   `gorm:"type:text" json:"keterangan"`
	LinkAsetTetap         bool                     `gorm:"default:false" json:"link_aset_tetap"`
	LinkPersediaan        bool                     `gorm:"default:false" json:"link_persediaan"`
	LinkBkUtang           bool                     `gorm:"default:false" json:"link_bk_utang"`
	LinkBkPiutang         bool                     `gorm:"default:false" json:"link_bk_piutang"`
	LinkJurnalPenyesuaian bool                     `gorm:"default:false" json:"link_jurnal_penyesuaian"`
	ProfileBUMDes         *ProfileBUMDes           `gorm:"foreignKey:ProfileBUMDesID" json:"profile_bumdes,omitempty"`
	UnitUsaha             *UnitUsaha               `gorm:"foreignKey:UnitUsahaID" json:"unit_usaha,omitempty"`
	Details               []MappingTransaksiDetail `gorm:"foreignKey:MappingTransaksiID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"details,omitempty"`
	CreatedAt             time.Time                `json:"created_at"`
	UpdatedAt             time.Time                `json:"updated_at"`
}

// MappingTransaksiDetail merepresentasikan satu baris jurnal (pasangan
// debet/kredit) di dalam satu MappingTransaksi. Sebuah mapping bisa
// memiliki lebih dari satu baris jurnal, misalnya transaksi penjualan
// yang sekaligus mencatat HPP/Persediaan.
type MappingTransaksiDetail struct {
	ID                    uint   `gorm:"primaryKey" json:"id"`
	MappingTransaksiID    uint   `gorm:"index;not null" json:"mapping_transaksi_id"`
	Urutan                int    `gorm:"default:1" json:"urutan"`
	AkunDebet             string `gorm:"type:varchar(255)" json:"akun_debet"`
	NominalDebet          string `gorm:"type:varchar(100)" json:"nominal_debet"`
	AkunKredit            string `gorm:"type:varchar(255)" json:"akun_kredit"`
	NominalKredit         string `gorm:"type:varchar(100)" json:"nominal_kredit"`
	Keterangan            string `gorm:"type:varchar(255)" json:"keterangan"`
	LinkAsetTetap         bool   `gorm:"default:false" json:"link_aset_tetap"`
	LinkPersediaan        bool   `gorm:"default:false" json:"link_persediaan"`
	LinkBkUtang           bool   `gorm:"default:false" json:"link_bk_utang"`
	LinkBkPiutang         bool   `gorm:"default:false" json:"link_bk_piutang"`
	LinkJurnalPenyesuaian bool   `gorm:"default:false" json:"link_jurnal_penyesuaian"`
}
