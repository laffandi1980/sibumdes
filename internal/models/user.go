package models

import (
	"time"
)

type User struct {
	ID        uint   `gorm:"primaryKey"`
	Nama      string `gorm:"type:varchar(255);not null"`
	Slug      string `gorm:"type:varchar(255);uniqueIndex"`
	Password  string `gorm:"type:varchar(255);not null"`
	RoleID          uint           `gorm:"not null"`
	Role            Role           `gorm:"foreignKey:RoleID"`
	ProfileBUMDesID *uint          `gorm:"index"`
	ProfileBUMDes   ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID"`
	NIK             string         `gorm:"type:varchar(50)"`
	NoHP      string `gorm:"type:varchar(50)"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
