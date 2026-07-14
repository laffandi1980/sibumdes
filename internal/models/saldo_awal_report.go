package models

import "time"

type SaldoAwalReport struct {
	ID                  uint           `gorm:"primaryKey"`
	ScopeKey            string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"scope_key"`
	ProfileBUMDesID     *uint          `gorm:"index" json:"profile_bumdes_id,omitempty"`
	ProfileBUMDes       *ProfileBUMDes `gorm:"foreignKey:ProfileBUMDesID" json:"profile_bumdes,omitempty"`
	Period              string         `gorm:"type:varchar(20);not null" json:"period"`
	RowsJSON            string         `gorm:"type:longtext" json:"-"`
	LastMasterRefreshAt *time.Time     `json:"last_master_refresh_at,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
}
