package models

import (
	"time"
)

type Role struct {
	ID                uint   `gorm:"primaryKey"`
	NamaPeran         string `gorm:"type:varchar(100);not null;unique"`
	DeskripsiHakAkses string `gorm:"type:text"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}
