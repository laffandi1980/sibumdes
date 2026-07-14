package service

import "golang.org/x/crypto/bcrypt"

func HashPassword(plain string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func IsBcryptHash(value string) bool {
	if len(value) < 4 {
		return false
	}
	return value[:4] == "$2a$" || value[:4] == "$2b$" || value[:4] == "$2y$"
}

func VerifyPassword(stored, plain string) bool {
	if IsBcryptHash(stored) {
		return bcrypt.CompareHashAndPassword([]byte(stored), []byte(plain)) == nil
	}
	return stored == plain
}
