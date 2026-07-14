#!/usr/bin/env bash
set -euo pipefail

MYSQL_SERVICE="mysql"

if ! command -v air >/dev/null 2>&1; then
  echo "air tidak ditemukan. Install dulu: go install github.com/air-verse/air@latest"
  exit 1
fi

if systemctl is-active --quiet "$MYSQL_SERVICE"; then
  echo "MySQL sudah aktif, lanjut menjalankan air..."
else
  echo "MySQL belum aktif, mencoba menyalakan service..."

  if sudo -n systemctl start "$MYSQL_SERVICE" 2>/dev/null; then
    echo "MySQL berhasil diaktifkan via sudo."
  elif systemctl start "$MYSQL_SERVICE" 2>/dev/null; then
    echo "MySQL berhasil diaktifkan."
  else
    echo "Gagal mengaktifkan MySQL otomatis."
    echo "Jalankan manual: sudo systemctl start $MYSQL_SERVICE"
    exit 1
  fi
fi

exec air
