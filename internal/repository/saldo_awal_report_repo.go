package repository

import (
	"sibumdes/internal/config"
	"sibumdes/internal/models"
)

func GetSaldoAwalReportByScope(scopeKey string) (*models.SaldoAwalReport, error) {
	if config.DB == nil {
		return nil, nil
	}

	var report models.SaldoAwalReport
	err := config.DB.Where("scope_key = ?", scopeKey).First(&report).Error
	if err != nil {
		return nil, err
	}

	return &report, nil
}

func SaveSaldoAwalReport(report *models.SaldoAwalReport) error {
	if config.DB == nil {
		return nil
	}

	var existing models.SaldoAwalReport
	err := config.DB.Where("scope_key = ?", report.ScopeKey).First(&existing).Error
	if err == nil {
		report.ID = existing.ID
		report.CreatedAt = existing.CreatedAt
	}

	return config.DB.Save(report).Error
}
