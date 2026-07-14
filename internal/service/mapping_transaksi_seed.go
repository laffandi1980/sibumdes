package service

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
	"strings"

	"github.com/google/uuid"
)

// HarianMappingSeedRow merepresentasikan satu baris template mapping
// transaksi harian (sesuai dengan file assets/Harian.xlsx).
//
// Baris dengan NamaMapping berakhiran " (HPP)" diperlakukan sebagai jurnal
// lanjutan dari mapping di atasnya, sehingga sebuah mapping bisa
// menyimpan lebih dari satu pasang debet/kredit di tabel
// mapping_transaksi_details.
type HarianMappingSeedRow struct {
	UnitUsaha          string
	NamaMapping        string
	AkunDebet          string
	AkunKredit         string
	CashInOut          string // kas_masuk / kas_keluar / non_kas
	KlasifikasiArusKas string // Aktivitas Operasi/Investasi/Pendanaan
	KategoriArusKas    string // sub kategori
	LinkBkUtang        bool
	LinkBkPiutang      bool
	LinkPersediaan     bool
	LinkAsetTetap      bool
}

// HarianMappingSeed berisi daftar default mapping transaksi harian yang
// diturunkan dari file assets/Harian.xlsx.
var HarianMappingSeed = []HarianMappingSeedRow{
	{"Peternakan Telur Sejahtera", "Jual Telur Grade A - Tunai", "1-1110 Kas", "4-1200 Pendapatan Penjualan Hasil Produksi", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan barang jadi", false, false, true, false},
	{"Peternakan Telur Sejahtera", "Jual Telur Grade A - Tunai (HPP)", "5-1200 HPP Barang Jadi / Hasil Produksi", "1-1420 Persediaan Barang Jadi", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Jual Telur Grade B - Tunai", "1-1110 Kas", "4-1200 Pendapatan Penjualan Hasil Produksi", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan barang jadi", false, false, true, false},
	{"Peternakan Telur Sejahtera", "Jual Telur Grade B - Tunai (HPP)", "5-1200 HPP Barang Jadi / Hasil Produksi", "1-1420 Persediaan Barang Jadi", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Jual Telur Grade B - Transfer BRI", "1-1210 Bank BRI", "4-1200 Pendapatan Penjualan Hasil Produksi", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan barang jadi", false, false, true, false},
	{"Peternakan Telur Sejahtera", "Jual Telur Grade B - Transfer BRI (HPP)", "5-1200 HPP Barang Jadi / Hasil Produksi", "1-1420 Persediaan Barang Jadi", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Jual Telur - Belum Dibayar", "1-1310 Piutang Usaha", "4-1200 Pendapatan Penjualan Hasil Produksi", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, true, true, false},
	{"Peternakan Telur Sejahtera", "Jual Telur - Belum Dibayar (HPP)", "5-1200 HPP Barang Jadi / Hasil Produksi", "1-1420 Persediaan Barang Jadi", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Terima Pelunasan Piutang Telur - tunai", "1-1110 Kas", "1-1310 Piutang Usaha", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan barang jadi", false, true, false, false},
	{"Peternakan Telur Sejahtera", "Beli Pakan Ayam - Tunai", "5-2210 Beban Operasional Peternakan Ayam Petelur", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Beli Pakan Ayam - Transfer", "5-2210 Beban Operasional Peternakan Ayam Petelur", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Beli Pakan Ayam - Belum Dibayar", "5-2210 Beban Operasional Peternakan Ayam Petelur", "2-0100 Utang Usaha", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", true, false, false, false},
	{"Peternakan Telur Sejahtera", "Beli Bibit Ayam - Tunai", "5-2210 Beban Operasional Peternakan Ayam Petelur", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Beli Obat/Vitamin - Tunai", "5-2210 Beban Operasional Peternakan Ayam Petelur", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Beli Pakan Tambahan - Tunai", "5-2210 Beban Operasional Peternakan Ayam Petelur", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Beli Tray Telur - Tunai", "5-2210 Beban Operasional Peternakan Ayam Petelur", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Bayar Gaji Pekerja - Tunai", "5-2100 Beban Pegawai", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran gaji/upah", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Bayar Listrik Kandang - Tunai", "5-2300 Beban Utilitas", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Bayar Perawatan Kandang - Tunai", "5-2400 Beban Pemeliharaan dan Perbaikan", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Bayar Air/Operasional Kandang - Tunai", "5-2210 Beban Operasional Peternakan Ayam Petelur", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Peternakan Telur Sejahtera", "Bayar Supplier Peternakan - Tunai", "2-0100 Utang Usaha", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran kepada pemasok barang", true, false, false, false},
	{"Peternakan Telur Sejahtera", "Bayar Pajak Usaha - Tunai", "5-2800 Beban Pajak", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran pajak", false, false, false, false},
	{"Minimarket Desa Mart", "Jual Barang - Tunai", "1-1110 Kas", "4-1100 Pendapatan Penjualan Barang Dagangan", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan barang dagangan", false, false, false, false},
	{"Minimarket Desa Mart", "Jual Barang - Tunai (HPP)", "5-1100 HPP Barang Dagangan", "1-1410 Persediaan Barang Dagangan", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, false, true, false},
	{"Minimarket Desa Mart", "Jual Barang - Transfer/QRIS", "1-1210 Bank BRI", "4-1100 Pendapatan Penjualan Barang Dagangan", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan barang dagangan", false, false, false, false},
	{"Minimarket Desa Mart", "Jual Barang - Transfer/QRIS (HPP)", "5-1100 HPP Barang Dagangan", "1-1410 Persediaan Barang Dagangan", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, false, true, false},
	{"Minimarket Desa Mart", "Jual Barang - Belum Dibayar", "1-1310 Piutang Usaha", "4-1100 Pendapatan Penjualan Barang Dagangan", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, true, false, false},
	{"Minimarket Desa Mart", "Jual Barang - Belum Dibayar (HPP)", "5-1100 HPP Barang Dagangan", "1-1410 Persediaan Barang Dagangan", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, false, true, false},
	{"Minimarket Desa Mart", "Terima Pelunasan Piutang Minimarket", "1-1110 Kas", "1-1310 Piutang Usaha", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan barang dagangan", false, true, false, false},
	{"Minimarket Desa Mart", "Beli Barang Dagang - Tunai", "1-1410 Persediaan Barang Dagangan", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran kepada pemasok barang", false, false, true, false},
	{"Minimarket Desa Mart", "Beli Barang Dagang - Transfer", "1-1410 Persediaan Barang Dagangan", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran kepada pemasok barang", false, false, true, false},
	{"Minimarket Desa Mart", "Beli Barang Dagang - Belum Dibayar", "1-1410 Persediaan Barang Dagangan", "2-0100 Utang Usaha", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", true, false, false, false},
	{"Minimarket Desa Mart", "Bayar Supplier Minimarket", "2-0100 Utang Usaha", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran kepada pemasok barang", true, false, false, false},
	{"Minimarket Desa Mart", "Bayar Gaji Karyawan", "5-2100 Beban Pegawai", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran gaji/upah", false, false, false, false},
	{"Minimarket Desa Mart", "Bayar Listrik Toko", "5-2300 Beban Utilitas", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Minimarket Desa Mart", "Beli Perlengkapan Toko", "1-1510 Perlengkapan", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Minimarket Desa Mart", "Beli ATK", "5-2200 Beban Administrasi dan Umum", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Minimarket Desa Mart", "Bayar Biaya Kebersihan", "5-2211 Beban Operasional Minimarket Desa Mart", "1-1110 Kas", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Penerimaan Jasa Tunai", "1-1110 Kas", "4-1300 Pendapatan Jasa", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan jasa", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Penerimaan Jasa Transfer", "1-1210 Bank BRI", "4-1300 Pendapatan Jasa", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan jasa", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Terima Pelunasan Piutang Jasa", "1-1110 Kas", "1-1310 Piutang Usaha", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari penjualan jasa", false, true, false, false},
	{"Layanan Jasa Desa Prima", "Jasa Diberikan - Belum Dibayar", "1-1310 Piutang Usaha", "4-1300 Pendapatan Jasa", "non_kas", "Aktivitas Operasi", "Transaksi Non Kas - Operasional", false, true, false, false},
	{"Layanan Jasa Desa Prima", "Bayar Gaji Tenaga Jasa", "5-2100 Beban Pegawai", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran gaji/upah", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Beli ATK", "5-2200 Beban Administrasi dan Umum", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Bayar Listrik", "5-2300 Beban Utilitas", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Bayar Internet", "5-2212 Beban Operasional Layanan Jasa Desa Prima", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Bayar Transport Operasional", "5-2212 Beban Operasional Layanan Jasa Desa Prima", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Beli Perlengkapan Jasa", "1-1510 Perlengkapan", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Bayar Sewa Tempat", "5-2600 Beban Sewa dan Asuransi", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"Layanan Jasa Desa Prima", "Bayar Biaya Lainnya", "5-2212 Beban Operasional Layanan Jasa Desa Prima", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"BUMDes Umum", "Penerimaan Bunga Bank", "1-1210 Bank BRI", "4-2100 Pendapatan Bunga Bank", "kas_masuk", "Aktivitas Operasi", "Penerimaan kas dari bunga bank", false, false, false, false},
	{"BUMDes Umum", "Bayar Biaya Administrasi Bank", "5-3100 Beban Bank", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran beban-beban lainnya", false, false, false, false},
	{"BUMDes Umum", "Bayar Bunga Pinjaman", "5-3200 Beban Bunga", "1-1210 Bank BRI", "kas_keluar", "Aktivitas Operasi", "Pengeluaran kas untuk pembayaran bunga", false, false, false, false},
}

// SeedHarianMappingResult merangkum hasil seeding.
type SeedHarianMappingResult struct {
	Inserted int      `json:"inserted"`
	Skipped  int      `json:"skipped"`
	Total    int      `json:"total"`
	Warnings []string `json:"warnings,omitempty"`
}

// NonRutinMappingSeedRow merepresentasikan satu baris template mapping
// transaksi non rutin (sesuai assets/NonRutin.xlsx). Baris yang tidak punya
// UnitUsaha/NamaMapping diperlakukan sebagai jurnal lanjutan untuk mapping
// sebelumnya, sehingga satu record dapat berisi lebih dari satu baris debet /
// kredit pada tabel mapping_transaksi_details.
type NonRutinMappingSeedRow struct {
	UnitUsaha          string
	NamaMapping        string
	AkunDebet          string
	AkunKredit         string
	CashInOut          string // Kas Masuk / Kas Keluar / Non Kas
	KlasifikasiArusKas string // Investasi / Pembiayaan
	KategoriArusKas    string
	LinkBkUtang        bool
	LinkBkPiutang      bool
	LinkPersediaan     bool
	LinkAsetTetap      bool
	Keterangan         string
}

type LainnyaMappingSeedRow struct {
	UnitUsaha             string
	NamaMapping           string
	AkunDebet             string
	AkunKredit            string
	Keterangan            string
	LinkBkUtang           bool
	LinkBkPiutang         bool
	LinkPersediaan        bool
	LinkAsetTetap         bool
	LinkJurnalPenyesuaian bool
}

var NonRutinMappingSeed = []NonRutinMappingSeedRow{
	{"Peternakan Telur Sejahtera", "Jual Kandang Lama - Harga Jual Sama dengan Nilai Buku", "1-1210 Bank BRI", "1-2020 Bangunan", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2091 Akumulasi Penyusutan Bangunan", "", "", "", "", false, false, false, false, "Akumulasi Penyusutan"},
	{"Peternakan Telur Sejahtera", "Jual Kandang Lama - Ada Laba", "1-1210 Bank BRI", "1-2020 Bangunan", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2091 Akumulasi Penyusutan Bangunan", "4-2200 Laba Penjualan Aset Tetap", "", "", "", false, false, false, false, "Akumulasi Penyusutan + Laba"},
	{"Peternakan Telur Sejahtera", "Jual Kandang Lama - Ada Rugi", "1-1210 Bank BRI", "1-2020 Bangunan", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2091 Akumulasi Penyusutan Bangunan", "", "", "", "", false, false, false, false, "Akumulasi Penyusutan"},
	{"", "", "5-3400 Rugi Penjualan Aset Tetap", "", "", "", "", false, false, false, false, "Rugi Penjualan"},
	{"Peternakan Telur Sejahtera", "Beli Kandang Ayam Baru - Tunai", "1-2020 Bangunan", "1-1110 Kas / 1-1210 Bank BRI", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, true, ""},
	{"Peternakan Telur Sejahtera", "Beli Kandang Ayam Baru - Transfer", "1-2020 Bangunan", "1-1210 Bank BRI", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, true, ""},
	{"Peternakan Telur Sejahtera", "Beli Kandang Ayam Baru - Kredit", "1-2020 Bangunan", "2-1200 Utang Pihak Ketiga Jangka Panjang", "Non Kas", "", "", false, false, false, true, ""},
	{"Peternakan Telur Sejahtera", "Beli Mesin - Tunai", "1-2040 Peralatan dan Mesin", "1-1110 Kas", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, false, ""},
	{"Peternakan Telur Sejahtera", "Beli Mesin - Transfer", "1-2040 Peralatan dan Mesin", "1-1210 Bank BRI", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, false, ""},
	{"Peternakan Telur Sejahtera", "Beli Mesin - Kredit", "1-2040 Peralatan dan Mesin", "2-1200 Utang Pihak Ketiga Jangka Panjang", "Non Kas", "", "", false, false, false, true, ""},
	{"Peternakan Telur Sejahtera", "Terima Modal dari Desa - Kas", "1-1110 Kas", "3-1100 Penyertaan Modal Desa", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal desa", false, false, false, false, ""},
	{"Peternakan Telur Sejahtera", "Terima Modal dari Desa - Transfer", "1-1210 Bank BRI", "3-1100 Penyertaan Modal Desa", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal desa", false, false, false, false, ""},
	{"Peternakan Telur Sejahtera", "Terima Modal dari Desa Berupa Bangunan", "1-2020 Bangunan", "3-1100 Penyertaan Modal Desa", "Non Kas", "", "", false, false, false, true, ""},
	{"Peternakan Telur Sejahtera", "Terima Modal dari Desa Berupa Peralatan dan Mesin", "1-2040 Peralatan dan Mesin", "3-1100 Penyertaan Modal Desa", "Non Kas", "", "", false, false, false, true, ""},
	{"Peternakan Telur Sejahtera", "Terima Pinjaman Bank", "1-1210 Bank BRI", "2-1100 Utang Bank Jangka Panjang", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari utang jangka panjang", false, false, false, false, ""},
	{"Peternakan Telur Sejahtera", "Bayar Cicilan Pokok Utang Bank", "2-1100 Utang Bank Jangka Panjang", "1-1210 Bank BRI", "Kas Keluar", "Pembiayaan", "Pembayaran pokok utang jangka panjang", false, false, false, false, ""},
	{"Peternakan Telur Sejahtera", "Bayar Bagi Hasil Desa", "3-1700 Bagi Hasil untuk Desa", "1-1110 Kas", "Kas Keluar", "Pembiayaan", "Pembayaran bagi hasil penyertaan modal desa", false, false, false, false, ""},
	{"Minimarket Desa Mart", "Jual Rak Toko Lama - Impas", "1-1110 Kas", "1-2050 Meubelair/Inventaris", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2094 Akumulasi Penyusutan Meubelair/Inventaris", "", "", "", "", false, false, false, false, "Akumulasi Penyusutan"},
	{"Minimarket Desa Mart", "Jual Rak Toko Lama - Ada Laba", "1-1110 Kas", "1-2050 Meubelair/Inventaris", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2094 Akumulasi Penyusutan Meubelair/Inventaris", "4-2200 Laba Penjualan Aset Tetap", "", "", "", false, false, false, false, "Akumulasi Penyusutan + Laba"},
	{"Minimarket Desa Mart", "Jual Rak Toko Lama - Ada Rugi", "1-1110 Kas", "1-2050 Meubelair/Inventaris", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2094 Akumulasi Penyusutan Meubelair/Inventaris", "", "", "", "", false, false, false, false, "Akumulasi Penyusutan"},
	{"", "", "5-3400 Rugi Penjualan Aset Tetap", "", "", "", "", false, false, false, false, "Rugi Penjualan"},
	{"Minimarket Desa Mart", "Beli Rak Toko Baru - Tunai", "1-2050 Meubelair/Inventaris", "1-1110 Kas", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Beli Rak Toko Baru - Transfer", "1-2050 Meubelair/Inventaris", "1-1210 Bank BRI", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Beli Rak Toko Baru - Kredit", "1-2050 Meubelair/Inventaris", "2-0500 Utang Jangka Pendek Lainnya", "Non Kas", "", "", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Beli Mesin Kasir - Tunai", "1-2040 Peralatan dan Mesin", "1-1110 Kas", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Beli Mesin Kasir - Transfer", "1-2040 Peralatan dan Mesin", "1-1210 Bank BRI", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Beli Mesin Kasir - Kredit", "1-2040 Peralatan dan Mesin", "2-0500 Utang Jangka Pendek Lainnya", "Non Kas", "", "", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Terima Modal dari Desa - Kas", "1-1110 Kas", "3-1100 Penyertaan Modal Desa", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal desa", false, false, false, false, ""},
	{"Minimarket Desa Mart", "Terima Modal dari Desa - Bank", "1-1210 Bank BRI", "3-1100 Penyertaan Modal Desa", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal desa", false, false, false, false, ""},
	{"Minimarket Desa Mart", "Terima Modal dari Warga - Kas", "1-1110 Kas", "3-1200 Penyertaan Modal Masyarakat", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal masyarakat", false, false, false, false, ""},
	{"Minimarket Desa Mart", "Terima Modal dari Warga Berupa Peralatan dan Mesin", "1-2040 Peralatan dan Mesin", "3-1200 Penyertaan Modal Masyarakat", "Non Kas", "", "", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Terima Modal dari Warga Berupa Meubelair", "1-2050 Meubelair/Inventaris", "3-1200 Penyertaan Modal Masyarakat", "Non Kas", "", "", false, false, false, true, ""},
	{"Minimarket Desa Mart", "Bagi Hasil ke Warga", "3-1800 Bagi Hasil untuk Masyarakat", "1-1110 Kas", "Kas Keluar", "Pembiayaan", "Pembayaran bagi hasil penyertaan modal masyarakat", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Jual Peralatan Lama - Impas", "1-1110 Kas", "1-2040 Peralatan dan Mesin", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin", "", "", "", "", false, false, false, false, "Akumulasi Penyusutan"},
	{"Layanan Jasa Desa Prima", "Jual Peralatan Lama - Ada Laba", "1-1110 Kas", "1-2040 Peralatan dan Mesin", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin", "4-2200 Laba Penjualan Aset Tetap", "", "", "", false, false, false, false, "Akumulasi Penyusutan + Laba"},
	{"Layanan Jasa Desa Prima", "Jual Peralatan Lama - Ada Rugi", "1-1110 Kas", "1-2040 Peralatan dan Mesin", "Kas Masuk", "Investasi", "Penerimaan kas dari penjualan aset tetap", false, false, false, true, ""},
	{"", "", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin", "", "", "", "", false, false, false, false, "Akumulasi Penyusutan"},
	{"", "", "5-3400 Rugi Penjualan Aset Tetap", "", "", "", "", false, false, false, false, "Rugi Penjualan"},
	{"Layanan Jasa Desa Prima", "Beli Peralatan Jasa Baru - Tunai/Transfer", "1-2040 Peralatan dan Mesin", "1-1210 Bank BRI", "Kas Keluar", "Investasi", "Pengeluaran kas untuk pembelian aset tetap", false, false, false, true, ""},
	{"Layanan Jasa Desa Prima", "Beli Peralatan Jasa Baru - Kredit", "1-2040 Peralatan dan Mesin", "2-0500 Utang Jangka Pendek Lainnya", "Non Kas", "", "", false, false, false, true, ""},
	{"Layanan Jasa Desa Prima", "Simpan Dana ke Investasi Jangka Panjang", "1-3010 Investasi Jangka Panjang", "1-1210 Bank BRI", "Kas Keluar", "Investasi", "Pengeluaran kas untuk investasi", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Terima Modal dari Desa - Kas", "1-1110 Kas", "3-1100 Penyertaan Modal Desa", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal desa", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Terima Modal dari Desa - Bank", "1-1210 Bank BRI", "3-1100 Penyertaan Modal Desa", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal desa", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Terima Modal dari Warga - Kas", "1-1110 Kas", "3-1200 Penyertaan Modal Masyarakat", "Kas Masuk", "Pembiayaan", "Penerimaan kas dari penyertaan modal masyarakat", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Terima Modal dari Warga Berupa Peralatan dan Mesin", "1-2040 Peralatan dan Mesin", "3-1200 Penyertaan Modal Masyarakat", "Non Kas", "", "", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Terima Modal dari Warga Berupa Meubelair", "1-2050 Meubelair/Inventaris", "3-1200 Penyertaan Modal Masyarakat", "Non Kas", "", "", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Bagi Hasil ke Warga", "3-1800 Bagi Hasil untuk Masyarakat", "1-1110 Kas", "Kas Keluar", "Pembiayaan", "Pembayaran bagi hasil penyertaan modal masyarakat", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Bayar Cicilan Pokok Utang Bank", "2-1100 Utang Bank Jangka Panjang", "1-1210 Bank BRI", "Kas Keluar", "Pembiayaan", "Pembayaran pokok utang jangka panjang", false, false, false, false, ""},
	{"Layanan Jasa Desa Prima", "Bayar Bagi Hasil Desa", "3-1700 Bagi Hasil untuk Desa", "1-1110 Kas", "Kas Keluar", "Pembiayaan", "Pembayaran bagi hasil penyertaan modal desa", false, false, false, false, ""},
	{"BUMDes Umum", "Terima Hibah/Bantuan Aset dari Pemerintah/BKK Berupa Bangunan", "1-2020 Bangunan", "3-1300 Penyertaan Modal Bantuan Pemerintah/BKK", "Non Kas", "", "", false, false, false, true, ""},
	{"BUMDes Umum", "Terima Hibah/Bantuan Aset dari Pemerintah/BKK Berupa Peralatan dan Mesin", "1-2040 Peralatan dan Mesin", "3-1300 Penyertaan Modal Bantuan Pemerintah/BKK", "Non Kas", "", "", false, false, false, true, ""},
	{"BUMDes Umum", "Terima Hibah/Bantuan Aset dari Pemerintah/BKK Berupa Meubelair", "1-2050 Meubelair/Inventaris", "3-1300 Penyertaan Modal Bantuan Pemerintah/BKK", "Non Kas", "", "", false, false, false, true, ""},
	{"BUMDes Umum", "Konversi Utang Menjadi Penyertaan Modal Desa", "2-1200 Utang Pihak Ketiga Jangka Panjang / 2-1300 Utang Jangka Panjang Lainnya", "3-1100 Penyertaan Modal Desa", "Non Kas", "", "", false, false, false, true, ""},
	{"BUMDes Umum", "Konversi Utang Menjadi Penyertaan Modal Masyarakat", "2-1200 Utang Pihak Ketiga Jangka Panjang / 2-1300 Utang Jangka Panjang Lainnya", "3-1200 Penyertaan Modal Masyarakat", "Non Kas", "", "", false, false, false, false, ""},
	{"BUMDes Umum", "Penghapusan Aset Rusak - Nilai Buku Masih Ada", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin; 5-3400 Rugi Penjualan Aset Tetap", "1-2040 Peralatan dan Mesin", "Non Kas", "", "", false, false, false, true, ""},
	{"BUMDes Umum", "Penghapusan Aset Rusak - Sudah Habis Disusutkan", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin", "1-2040 Peralatan dan Mesin", "Non Kas", "", "", false, false, false, true, ""},
	{"BUMDes Umum", "Reklasifikasi Perlengkapan Menjadi Inventaris", "1-2050 Meubelair/Inventaris", "1-1510 Perlengkapan", "Non Kas", "", "", false, false, false, true, ""},
	{"BUMDes Umum", "Reklasifikasi Mesin ke Aset Tetap Lainnya", "1-2060 Aset Tetap Lainnya", "1-2040 Peralatan dan Mesin", "Non Kas", "", "", false, false, false, true, ""},
}

var LainnyaMappingSeed = []LainnyaMappingSeedRow{
	{"Peternakan Telur Sejahtera", "Perbaiki catatan penjualan telur yang salah", "4-2300 Pendapatan Lain-lain Non-Operasional", "4-1200 Pendapatan Penjualan Hasil Produksi", "Jurnal Koreksi", false, false, false, false, false},
	{"Peternakan Telur Sejahtera", "Masukkan nilai biaya produksi ke stok telur", "1-1420 Persediaan Barang Jadi", "5-2210 Beban Operasional Peternakan Ayam Petelur", "Jurnal Penyesuaian", false, false, true, false, true},
	{"Peternakan Telur Sejahtera", "Koreksi biaya ke beban operasional peternakan ayam petelur", "5-2210 Beban Operasional Peternakan Ayam Petelur", "5-2900 Beban Operasional Lainnya", "Jurnal Koreksi", false, false, false, false, false},
	{"Minimarket Desa Mart", "Perbaiki catatan penjualan toko", "4-2300 Pendapatan Lain-lain Non-Operasional", "4-1100 Pendapatan Penjualan Barang Dagangan", "Jurnal Koreksi", false, false, false, false, false},
	{"Minimarket Desa Mart", "Koreksi pembelian ke perlengkapan toko", "1-1510 Perlengkapan", "5-2200 Beban Administrasi dan Umum", "Jurnal Koreksi", false, false, false, false, false},
	{"Layanan Jasa Desa Prima", "Perbaiki catatan jasa yang salah", "4-2300 Pendapatan Lain-lain Non-Operasional", "4-1300 Pendapatan Jasa", "Jurnal Koreksi", false, false, false, false, false},
	{"Layanan Jasa Desa Prima", "Koreksi biaya ke beban operasional layanan jasa", "5-2212 Beban Operasional Layanan Jasa Desa Prima", "5-2200 Beban Administrasi dan Umum", "Jurnal Koreksi", false, false, false, false, false},
}

var JurnalMappingSeed = []LainnyaMappingSeedRow{
	{"Peternakan Telur Sejahtera", "Masukkan nilai biaya produksi ke stok telur", "1-1420 Persediaan Barang Jadi", "5-2210 Beban Operasional Peternakan Ayam Petelur", "Digunakan untuk memindahkan biaya produksi telur ke nilai persediaan telur.", false, false, true, false, true},
	{"Peternakan Telur Sejahtera", "Penyesuaian stok telur akhir bulan - stok bertambah", "1-1420 Persediaan Barang Jadi", "5-2210 Beban Operasional Peternakan Ayam Petelur", "Digunakan jika hasil cek fisik menunjukkan stok telur lebih besar dari catatan sistem.", false, false, true, false, true},
	{"Peternakan Telur Sejahtera", "Penyesuaian stok telur akhir bulan - stok berkurang/rusak", "5-1200 HPP Barang Jadi / Hasil Produksi", "1-1420 Persediaan Barang Jadi", "Digunakan jika stok telur rusak, pecah, hilang, atau lebih kecil dari catatan sistem.", false, false, true, false, true},
	{"Peternakan Telur Sejahtera", "Penyesuaian HPP telur terhadap persediaan yang telah terjual", "5-1200 HPP Barang Jadi / Hasil Produksi", "1-1420 Persediaan Barang Jadi", "Digunakan jika HPP penjualan telur perlu disesuaikan berdasarkan Kartu Persediaan.", false, false, true, false, true},
	{"Minimarket Desa Mart", "Penyesuaian stok barang toko - stok bertambah", "1-1410 Persediaan Barang Dagangan", "5-1100 HPP Barang Dagangan", "Digunakan jika hasil stock opname menunjukkan barang dagangan lebih besar dari catatan sistem.", false, false, true, false, true},
	{"Minimarket Desa Mart", "Penyesuaian stok barang toko - stok berkurang/rusak", "5-1100 HPP Barang Dagangan", "1-1410 Persediaan Barang Dagangan", "Digunakan jika barang dagangan rusak, hilang, kedaluwarsa, atau stok fisik lebih kecil dari catatan sistem.", false, false, true, false, true},
	{"", "Penyusutan aset tetap - Bangunan", "5-2700 Beban Penyusutan", "1-2091 Akumulasi Penyusutan Bangunan", "Digunakan untuk mencatat penyusutan bangunan berdasarkan Kartu Aset Tetap.", false, false, false, true, true},
	{"", "Penyusutan aset tetap - Kendaraan", "5-2700 Beban Penyusutan", "1-2092 Akumulasi Penyusutan Kendaraan", "Digunakan untuk mencatat penyusutan kendaraan berdasarkan Kartu Aset Tetap.", false, false, false, true, true},
	{"", "Penyusutan aset tetap - Peralatan dan Mesin", "5-2700 Beban Penyusutan", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin", "Digunakan untuk mencatat penyusutan mesin, komputer, printer, mesin kasir, dan peralatan lain berdasarkan Kartu Aset Tetap.", false, false, false, true, true},
	{"", "Penyusutan aset tetap - Meubelair/Inventaris", "5-2700 Beban Penyusutan", "1-2094 Akumulasi Penyusutan Meubelair/Inventaris", "Digunakan untuk mencatat penyusutan rak, etalase, meja, kursi, dan inventaris lain berdasarkan Kartu Aset Tetap.", false, false, false, true, true},
	{"", "Penyusutan aset tetap - Aset Tetap Lainnya", "5-2700 Beban Penyusutan", "1-2095 Akumulasi Penyusutan Aset Tetap Lainnya", "Digunakan untuk aset tetap yang tidak masuk kategori bangunan, kendaraan, mesin, atau inventaris.", false, false, false, true, true},
	{"BUMDes Umum", "Perlengkapan yang sudah terpakai", "5-2500 Beban Perlengkapan", "1-1510 Perlengkapan", "Digunakan untuk mengakui perlengkapan yang sudah dipakai selama periode berjalan.", false, false, false, false, true},
	{"BUMDes Umum", "Sewa/asuransi dibayar di muka yang sudah menjadi beban periode berjalan", "5-2600 Beban Sewa dan Asuransi", "1-1520 Biaya Dibayar di Muka", "Digunakan untuk mengakui bagian biaya dibayar di muka yang sudah menjadi beban periode berjalan.", false, false, false, false, true},
	{"BUMDes Umum", "Beban listrik masih harus dibayar", "5-2300 Beban Utilitas", "2-0400 Utang Utilitas", "Digunakan jika listrik sudah dipakai tetapi belum dibayar sampai akhir periode. Tidak masuk BP Utang supplier.", false, false, false, false, true},
	{"BUMDes Umum", "Beban air/internet masih harus dibayar", "5-2300 Beban Utilitas", "2-0400 Utang Utilitas", "Digunakan jika air, internet, atau utilitas lain sudah menjadi beban tetapi belum dibayar. Tidak masuk BP Utang supplier.", false, false, false, false, true},
	{"BUMDes Umum", "Beban gaji/upah masih harus dibayar", "5-2100 Beban Pegawai", "2-0300 Utang Gaji/Upah", "Digunakan jika gaji/upah sudah menjadi kewajiban tetapi belum dibayar pada akhir periode.", false, false, false, false, true},
	{"BUMDes Umum", "Beban operasional masih harus dibayar", "5-2900 Beban Operasional Lainnya", "2-0500 Utang Beban Lainnya", "Digunakan untuk beban operasional lain yang sudah terjadi tetapi belum dibayar.", false, false, false, false, true},
	{"BUMDes Umum", "Beban bunga masih harus dibayar", "5-3300 Beban Bunga", "2-0600 Utang Bunga", "Digunakan jika bunga pinjaman sudah menjadi beban periode berjalan tetapi belum dibayar.", false, false, false, false, true},
	{"BUMDes Umum", "Beban administrasi bank belum dicatat", "5-3100 Beban Bank", "1-1210 Bank BRI", "Digunakan jika terdapat potongan administrasi bank pada rekening koran tetapi belum dicatat di sistem.", false, false, false, false, true},
	{"BUMDes Umum", "Pendapatan bunga bank belum dicatat", "1-1210 Bank BRI", "4-2100 Pendapatan Bunga Bank", "Digunakan jika terdapat bunga bank pada rekening koran tetapi belum dicatat di sistem.", false, false, false, false, true},
	{"BUMDes Umum", "Pendapatan jasa masih harus diterima", "1-1310 Piutang Usaha", "4-1300 Pendapatan Jasa", "Digunakan jika jasa sudah diberikan tetapi belum ditagihkan atau belum diterima pembayarannya. Masuk BP Piutang hanya jika pelanggan teridentifikasi.", false, true, false, false, true},
	{"BUMDes Umum", "Pendapatan penjualan barang masih harus diterima", "1-1310 Piutang Usaha", "4-1100 Pendapatan Penjualan Barang Dagangan", "Digunakan jika barang sudah diserahkan tetapi pembayaran belum diterima. Masuk BP Piutang hanya jika pelanggan teridentifikasi.", false, true, true, false, true},
	{"BUMDes Umum", "Pendapatan penjualan hasil produksi masih harus diterima", "1-1310 Piutang Usaha", "4-1200 Pendapatan Penjualan Hasil Produksi", "Digunakan jika hasil produksi sudah dijual tetapi belum dibayar pelanggan. Masuk BP Piutang hanya jika pelanggan teridentifikasi.", false, true, true, false, true},
	{"BUMDes Umum", "Piutang usaha diperkirakan tidak tertagih", "5-3900 Beban Lain-lain Non-Operasional", "1-1320 Penyisihan Piutang Tak Tertagih", "Digunakan untuk membentuk cadangan kerugian piutang. Tidak menghapus piutang pelanggan secara langsung.", false, false, false, false, true},
	{"Peternakan Telur Sejahtera", "Perbaiki catatan penjualan telur yang salah", "4-2300 Pendapatan Lain-lain Non-Operasional", "4-1200 Pendapatan Penjualan Hasil Produksi", "Digunakan untuk reklasifikasi pendapatan yang salah akun. Tidak memengaruhi kas.", false, false, false, false, true},
	{"Minimarket Desa Mart", "Perbaiki catatan penjualan toko", "4-2300 Pendapatan Lain-lain Non-Operasional", "4-1100 Pendapatan Penjualan Barang Dagangan", "Digunakan untuk reklasifikasi pendapatan barang dagangan yang salah akun. Tidak memengaruhi kas.", false, false, false, false, true},
	{"Layanan Jasa Desa Prima", "Perbaiki catatan jasa yang salah", "4-2300 Pendapatan Lain-lain Non-Operasional", "4-1300 Pendapatan Jasa", "Digunakan untuk reklasifikasi pendapatan jasa yang salah akun. Tidak memengaruhi kas.", false, false, false, false, true},
	{"Peternakan Telur Sejahtera", "Koreksi biaya ke beban operasional peternakan ayam petelur", "5-2210 Beban Operasional Peternakan Ayam Petelur", "5-2900 Beban Operasional Lainnya", "Digunakan untuk memindahkan biaya yang salah dicatat ke beban operasional peternakan.", false, false, false, false, true},
	{"Minimarket Desa Mart", "Koreksi pembelian ke perlengkapan toko", "1-1510 Perlengkapan", "5-2200 Beban Administrasi dan Umum", "Digunakan jika pembelian perlengkapan sebelumnya salah dicatat sebagai beban administrasi.", false, false, false, false, true},
	{"Layanan Jasa Desa Prima", "Koreksi biaya ke beban operasional layanan jasa", "5-2212 Beban Operasional Layanan Jasa Desa Prima", "5-2200 Beban Administrasi dan Umum", "Digunakan untuk memindahkan biaya yang salah dicatat ke beban operasional layanan jasa.", false, false, false, false, true},
}

func normalizeSeedCashFlow(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "kas masuk", "kas_masuk":
		return "kas_masuk"
	case "kas keluar", "kas_keluar":
		return "kas_keluar"
	case "non kas", "non_kas":
		return "non_kas"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizeNonRutinKlasifikasi(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "investasi", "aktivitas investasi":
		return "Aktivitas Investasi"
	case "pembiayaan", "aktivitas pendanaan", "pendanaan":
		return "Aktivitas Pendanaan"
	default:
		return strings.TrimSpace(value)
	}
}

func appendSeedDetailRows(details []models.MappingTransaksiDetail, debit string, kredit string, keterangan string) []models.MappingTransaksiDetail {
	splitParts := func(value string) []string {
		value = strings.TrimSpace(value)
		if value == "" {
			return []string{""}
		}
		parts := []string{}
		if strings.Contains(value, ";") {
			for _, part := range strings.Split(value, ";") {
				part = strings.TrimSpace(part)
				if part != "" {
					parts = append(parts, part)
				}
			}
		}
		if len(parts) == 0 {
			parts = append(parts, value)
		}
		return parts
	}

	debitParts := splitParts(debit)
	kreditParts := splitParts(kredit)
	maxParts := len(debitParts)
	if len(kreditParts) > maxParts {
		maxParts = len(kreditParts)
	}
	for idx := 0; idx < maxParts; idx++ {
		debitPart := ""
		if idx < len(debitParts) {
			debitPart = debitParts[idx]
		}
		kreditPart := ""
		if idx < len(kreditParts) {
			kreditPart = kreditParts[idx]
		}
		detail := models.MappingTransaksiDetail{
			Urutan:     len(details) + 1,
			AkunDebet:  debitPart,
			AkunKredit: kreditPart,
		}
		if strings.TrimSpace(keterangan) != "" {
			detail.Keterangan = strings.TrimSpace(keterangan)
		}
		details = append(details, detail)
	}
	return details
}

// SeedHarianMappingTransaksi memasukkan data default mapping harian untuk
// profil BUMDes tertentu. Baris yang sudah ada (berdasarkan nama mapping
// + unit usaha + jenis_mapping=harian + profile) akan dilewati.
//
// Baris seed dengan suffix " (HPP)" diperlakukan sebagai jurnal lanjutan
// (detail kedua) dari mapping di atasnya, sehingga sebuah mapping dapat
// menyimpan lebih dari satu pasang Debet/Kredit di tabel
// mapping_transaksi_details.
func SeedHarianMappingTransaksi(profileID *uint) (*SeedHarianMappingResult, error) {
	result := &SeedHarianMappingResult{Total: 0}

	// Build cache unit usaha by name (lower-cased) untuk profil ini.
	unitCache := map[string]uint{}
	if profileID != nil {
		var units []models.UnitUsaha
		if err := config.DB.Where("profile_id = ?", *profileID).Find(&units).Error; err == nil {
			for _, u := range units {
				unitCache[strings.ToLower(strings.TrimSpace(u.NamaUnitUsaha))] = u.ID
			}
		}
	}

	// Kelompokkan baris seed: setiap entry tanpa suffix "(HPP)" menjadi
	// mapping induk; entry "(HPP)" berikutnya menjadi detail tambahan.
	type group struct {
		head HarianMappingSeedRow
		more []HarianMappingSeedRow
	}
	groups := []group{}
	for _, row := range HarianMappingSeed {
		isHPP := strings.HasSuffix(row.NamaMapping, " (HPP)")
		if isHPP && len(groups) > 0 {
			groups[len(groups)-1].more = append(groups[len(groups)-1].more, row)
			continue
		}
		groups = append(groups, group{head: row})
	}
	result.Total = len(groups)

	warned := map[string]bool{}
	for _, g := range groups {
		row := g.head
		var unitIDPtr *uint
		key := strings.ToLower(strings.TrimSpace(row.UnitUsaha))
		if id, ok := unitCache[key]; ok {
			uid := id
			unitIDPtr = &uid
		} else if !warned[key] {
			result.Warnings = append(result.Warnings, "Unit usaha tidak ditemukan: "+row.UnitUsaha+" (mapping tetap dibuat tanpa unit usaha)")
			warned[key] = true
		}

		// Cek duplikasi: nama + jenis_mapping + unit + profile
		query := config.DB.Model(&models.MappingTransaksi{}).
			Where("nama_mapping = ?", row.NamaMapping).
			Where("jenis_mapping = ?", "harian")
		if profileID != nil {
			query = query.Where("profile_bum_des_id = ?", *profileID)
		} else {
			query = query.Where("profile_bum_des_id IS NULL")
		}
		if unitIDPtr != nil {
			query = query.Where("unit_usaha_id = ?", *unitIDPtr)
		} else {
			query = query.Where("unit_usaha_id IS NULL")
		}
		var count int64
		query.Count(&count)
		if count > 0 {
			result.Skipped++
			continue
		}

		kategoriTransaksi := "masuk"
		if row.CashInOut == "kas_keluar" {
			kategoriTransaksi = "keluar"
		}

		// Susun details: baris pertama dari mapping induk, lalu tiap (HPP).
		details := []models.MappingTransaksiDetail{
			{Urutan: 1, AkunDebet: row.AkunDebet, AkunKredit: row.AkunKredit},
		}
		for i, extra := range g.more {
			details = append(details, models.MappingTransaksiDetail{
				Urutan:     i + 2,
				AkunDebet:  extra.AkunDebet,
				AkunKredit: extra.AkunKredit,
				Keterangan: "HPP",
			})
		}

		item := &models.MappingTransaksi{
			Slug:               uuid.New().String(),
			JenisMapping:       "harian",
			ProfileBUMDesID:    profileID,
			UnitUsahaID:        unitIDPtr,
			NamaMapping:        row.NamaMapping,
			KategoriTransaksi:  kategoriTransaksi,
			KlasifikasiArusKas: row.KlasifikasiArusKas,
			CashInOut:          row.CashInOut,
			KategoriArusKas:    row.KategoriArusKas,
			TipeDefault:        "semua",
			AkunDebet:          row.AkunDebet,
			AkunKredit:         row.AkunKredit,
			LinkAsetTetap:      row.LinkAsetTetap,
			LinkPersediaan:     row.LinkPersediaan,
			LinkBkUtang:        row.LinkBkUtang,
			LinkBkPiutang:      row.LinkBkPiutang,
			Details:            details,
		}
		if err := repository.SaveMappingTransaksi(item); err != nil {
			result.Warnings = append(result.Warnings, "Gagal menyimpan '"+row.NamaMapping+"': "+err.Error())
			continue
		}
		result.Inserted++
	}

	return result, nil
}

// SeedNonRutinMappingTransaksi memasukkan data default mapping non rutin
// sesuai template NonRutin.xlsx untuk profil BUMDes yang sedang login.
//
// Aturan grouping:
//   - baris yang memiliki NamaMapping menjadi mapping induk
//   - baris berikutnya yang NamaMapping-nya kosong menjadi detail jurnal
//     tambahan untuk mapping induk terakhir
//   - nilai Debit yang dipisahkan ';' dipecah menjadi beberapa detail debit
//     agar satu record dapat memiliki lebih dari satu baris debit/kredit
func SeedNonRutinMappingTransaksi(profileID *uint) (*SeedHarianMappingResult, error) {
	result := &SeedHarianMappingResult{Total: 0}

	unitCache := map[string]uint{}
	if profileID != nil {
		var units []models.UnitUsaha
		if err := config.DB.Where("profile_id = ?", *profileID).Find(&units).Error; err == nil {
			for _, u := range units {
				unitCache[strings.ToLower(strings.TrimSpace(u.NamaUnitUsaha))] = u.ID
			}
		}
	}

	type group struct {
		head NonRutinMappingSeedRow
		more []NonRutinMappingSeedRow
	}
	groups := []group{}
	for _, row := range NonRutinMappingSeed {
		if strings.TrimSpace(row.NamaMapping) == "" && len(groups) > 0 {
			groups[len(groups)-1].more = append(groups[len(groups)-1].more, row)
			continue
		}
		groups = append(groups, group{head: row})
	}
	result.Total = len(groups)

	warned := map[string]bool{}
	for _, g := range groups {
		row := g.head
		var unitIDPtr *uint
		key := strings.ToLower(strings.TrimSpace(row.UnitUsaha))
		if id, ok := unitCache[key]; ok {
			uid := id
			unitIDPtr = &uid
		} else if key != "" && !warned[key] {
			result.Warnings = append(result.Warnings, "Unit usaha tidak ditemukan: "+row.UnitUsaha+" (mapping tetap dibuat tanpa unit usaha)")
			warned[key] = true
		}

		query := config.DB.Model(&models.MappingTransaksi{}).
			Where("nama_mapping = ?", row.NamaMapping).
			Where("jenis_mapping = ?", "non_rutin")
		if profileID != nil {
			query = query.Where("profile_bum_des_id = ?", *profileID)
		} else {
			query = query.Where("profile_bum_des_id IS NULL")
		}
		if unitIDPtr != nil {
			query = query.Where("unit_usaha_id = ?", *unitIDPtr)
		} else {
			query = query.Where("unit_usaha_id IS NULL")
		}
		var count int64
		query.Count(&count)
		if count > 0 {
			result.Skipped++
			continue
		}

		cashFlow := normalizeSeedCashFlow(row.CashInOut)
		kategoriTransaksi := "masuk"
		if cashFlow == "kas_keluar" {
			kategoriTransaksi = "keluar"
		}

		details := []models.MappingTransaksiDetail{}
		details = appendSeedDetailRows(details, row.AkunDebet, row.AkunKredit, row.Keterangan)
		for _, extra := range g.more {
			details = appendSeedDetailRows(details, extra.AkunDebet, extra.AkunKredit, extra.Keterangan)
		}
		if len(details) == 0 {
			result.Warnings = append(result.Warnings, "Mapping non rutin tanpa detail jurnal dilewati: "+row.NamaMapping)
			continue
		}

		item := &models.MappingTransaksi{
			Slug:               uuid.New().String(),
			JenisMapping:       "non_rutin",
			ProfileBUMDesID:    profileID,
			UnitUsahaID:        unitIDPtr,
			NamaMapping:        row.NamaMapping,
			KategoriTransaksi:  kategoriTransaksi,
			KlasifikasiArusKas: normalizeNonRutinKlasifikasi(row.KlasifikasiArusKas),
			CashInOut:          cashFlow,
			KategoriArusKas:    strings.TrimSpace(row.KategoriArusKas),
			TipeDefault:        "semua",
			AkunDebet:          details[0].AkunDebet,
			AkunKredit:         details[0].AkunKredit,
			LinkAsetTetap:      row.LinkAsetTetap,
			LinkPersediaan:     row.LinkPersediaan,
			LinkBkUtang:        row.LinkBkUtang,
			LinkBkPiutang:      row.LinkBkPiutang,
			Details:            details,
		}
		if err := repository.SaveMappingTransaksi(item); err != nil {
			result.Warnings = append(result.Warnings, "Gagal menyimpan '"+row.NamaMapping+"': "+err.Error())
			continue
		}
		result.Inserted++
	}

	return result, nil
}

// SeedLainnyaMappingTransaksi memasukkan data default mapping transaksi
// lainnya sesuai template TransaksiLainnya.xlsx untuk profile yang login.
// Jika nanti ada akun debit/kredit gabungan dengan pemisah ';' atau baris
// lanjutan, semuanya akan disimpan sebagai beberapa detail jurnal dalam satu
// record mapping_transaksi.
func SeedLainnyaMappingTransaksi(profileID *uint) (*SeedHarianMappingResult, error) {
	result := &SeedHarianMappingResult{Total: 0}

	unitCache := map[string]uint{}
	if profileID != nil {
		var units []models.UnitUsaha
		if err := config.DB.Where("profile_id = ?", *profileID).Find(&units).Error; err == nil {
			for _, u := range units {
				unitCache[strings.ToLower(strings.TrimSpace(u.NamaUnitUsaha))] = u.ID
			}
		}
	}

	type group struct {
		head LainnyaMappingSeedRow
		more []LainnyaMappingSeedRow
	}
	groups := []group{}
	for _, row := range LainnyaMappingSeed {
		if strings.TrimSpace(row.NamaMapping) == "" && len(groups) > 0 {
			groups[len(groups)-1].more = append(groups[len(groups)-1].more, row)
			continue
		}
		groups = append(groups, group{head: row})
	}
	result.Total = len(groups)

	warned := map[string]bool{}
	for _, g := range groups {
		row := g.head
		var unitIDPtr *uint
		key := strings.ToLower(strings.TrimSpace(row.UnitUsaha))
		if id, ok := unitCache[key]; ok {
			uid := id
			unitIDPtr = &uid
		} else if key != "" && !warned[key] {
			result.Warnings = append(result.Warnings, "Unit usaha tidak ditemukan: "+row.UnitUsaha+" (mapping tetap dibuat tanpa unit usaha)")
			warned[key] = true
		}

		query := config.DB.Model(&models.MappingTransaksi{}).
			Where("nama_mapping = ?", row.NamaMapping).
			Where("jenis_mapping = ?", "umum")
		if profileID != nil {
			query = query.Where("profile_bum_des_id = ?", *profileID)
		} else {
			query = query.Where("profile_bum_des_id IS NULL")
		}
		if unitIDPtr != nil {
			query = query.Where("unit_usaha_id = ?", *unitIDPtr)
		} else {
			query = query.Where("unit_usaha_id IS NULL")
		}
		var count int64
		query.Count(&count)
		if count > 0 {
			result.Skipped++
			continue
		}

		details := []models.MappingTransaksiDetail{}
		details = appendSeedDetailRows(details, row.AkunDebet, row.AkunKredit, row.Keterangan)
		for _, extra := range g.more {
			details = appendSeedDetailRows(details, extra.AkunDebet, extra.AkunKredit, extra.Keterangan)
		}
		if len(details) == 0 {
			result.Warnings = append(result.Warnings, "Mapping transaksi lainnya tanpa detail jurnal dilewati: "+row.NamaMapping)
			continue
		}

		item := &models.MappingTransaksi{
			Slug:                  uuid.New().String(),
			JenisMapping:          "umum",
			ProfileBUMDesID:       profileID,
			UnitUsahaID:           unitIDPtr,
			NamaMapping:           row.NamaMapping,
			KategoriTransaksi:     "masuk",
			KlasifikasiArusKas:    "",
			CashInOut:             "non_kas",
			KategoriArusKas:       "",
			TipeDefault:           "semua",
			AkunDebet:             details[0].AkunDebet,
			AkunKredit:            details[0].AkunKredit,
			Keterangan:            row.Keterangan,
			LinkAsetTetap:         row.LinkAsetTetap,
			LinkPersediaan:        row.LinkPersediaan,
			LinkBkUtang:           row.LinkBkUtang,
			LinkBkPiutang:         row.LinkBkPiutang,
			LinkJurnalPenyesuaian: row.LinkJurnalPenyesuaian,
			Details:               details,
		}
		if err := repository.SaveMappingTransaksi(item); err != nil {
			result.Warnings = append(result.Warnings, "Gagal menyimpan '"+row.NamaMapping+"': "+err.Error())
			continue
		}
		result.Inserted++
	}

	return result, nil
}

// SeedJurnalMappingTransaksi memasukkan data default mapping jurnal sesuai
// template Jurnal.xlsx untuk profile yang sedang login. Record akan tetap
// mendukung lebih dari satu baris debit/kredit melalui helper details yang
// sama dengan seed mapping lainnya.
func SeedJurnalMappingTransaksi(profileID *uint) (*SeedHarianMappingResult, error) {
	result := &SeedHarianMappingResult{Total: 0}

	unitCache := map[string]uint{}
	if profileID != nil {
		var units []models.UnitUsaha
		if err := config.DB.Where("profile_id = ?", *profileID).Find(&units).Error; err == nil {
			for _, u := range units {
				unitCache[strings.ToLower(strings.TrimSpace(u.NamaUnitUsaha))] = u.ID
			}
		}
	}

	type group struct {
		head LainnyaMappingSeedRow
		more []LainnyaMappingSeedRow
	}
	groups := []group{}
	for _, row := range JurnalMappingSeed {
		if strings.TrimSpace(row.NamaMapping) == "" && len(groups) > 0 {
			groups[len(groups)-1].more = append(groups[len(groups)-1].more, row)
			continue
		}
		groups = append(groups, group{head: row})
	}
	result.Total = len(groups)

	warned := map[string]bool{}
	for _, g := range groups {
		row := g.head
		var unitIDPtr *uint
		key := strings.ToLower(strings.TrimSpace(row.UnitUsaha))
		if id, ok := unitCache[key]; ok {
			uid := id
			unitIDPtr = &uid
		} else if key != "" && !warned[key] {
			result.Warnings = append(result.Warnings, "Unit usaha tidak ditemukan: "+row.UnitUsaha+" (mapping tetap dibuat tanpa unit usaha)")
			warned[key] = true
		}

		query := config.DB.Model(&models.MappingTransaksi{}).
			Where("nama_mapping = ?", row.NamaMapping).
			Where("jenis_mapping = ?", "jurnal")
		if profileID != nil {
			query = query.Where("profile_bum_des_id = ?", *profileID)
		} else {
			query = query.Where("profile_bum_des_id IS NULL")
		}
		if unitIDPtr != nil {
			query = query.Where("unit_usaha_id = ?", *unitIDPtr)
		} else {
			query = query.Where("unit_usaha_id IS NULL")
		}
		var count int64
		query.Count(&count)
		if count > 0 {
			result.Skipped++
			continue
		}

		details := []models.MappingTransaksiDetail{}
		details = appendSeedDetailRows(details, row.AkunDebet, row.AkunKredit, row.Keterangan)
		for _, extra := range g.more {
			details = appendSeedDetailRows(details, extra.AkunDebet, extra.AkunKredit, extra.Keterangan)
		}
		if len(details) == 0 {
			result.Warnings = append(result.Warnings, "Mapping jurnal tanpa detail jurnal dilewati: "+row.NamaMapping)
			continue
		}

		item := &models.MappingTransaksi{
			Slug:                  uuid.New().String(),
			JenisMapping:          "jurnal",
			ProfileBUMDesID:       profileID,
			UnitUsahaID:           unitIDPtr,
			NamaMapping:           row.NamaMapping,
			KategoriTransaksi:     "masuk",
			KlasifikasiArusKas:    "",
			CashInOut:             "non_kas",
			KategoriArusKas:       "",
			TipeDefault:           "semua",
			AkunDebet:             details[0].AkunDebet,
			AkunKredit:            details[0].AkunKredit,
			Keterangan:            row.Keterangan,
			LinkAsetTetap:         row.LinkAsetTetap,
			LinkPersediaan:        row.LinkPersediaan,
			LinkBkUtang:           row.LinkBkUtang,
			LinkBkPiutang:         row.LinkBkPiutang,
			LinkJurnalPenyesuaian: row.LinkJurnalPenyesuaian,
			Details:               details,
		}
		if err := repository.SaveMappingTransaksi(item); err != nil {
			result.Warnings = append(result.Warnings, "Gagal menyimpan '"+row.NamaMapping+"': "+err.Error())
			continue
		}
		result.Inserted++
	}

	return result, nil
}
