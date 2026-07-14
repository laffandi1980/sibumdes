package service

import (
	"sibumdes/internal/models"
	"sibumdes/internal/repository"
)

func GetSaldoAwalReportByScope(scopeKey string) (*models.SaldoAwalReport, error) {
	return repository.GetSaldoAwalReportByScope(scopeKey)
}

func SaveSaldoAwalReport(report *models.SaldoAwalReport) error {
	return repository.SaveSaldoAwalReport(report)
}
