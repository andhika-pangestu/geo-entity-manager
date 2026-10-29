package config

import (
	"fmt"
	"os"
)

const (
	defaultPort      = "8080"
	defaultDBHost    = "localhost"
	defaultDBPort    = "5432"
	defaultDBUser    = "postgres"
	defaultDBPass    = "postgres"
	defaultDBName    = "geo_entity_db"
	defaultDBSSLMode = "disable"
)

// Config holds immutable application configuration loaded from environment variables.
type Config struct {
	Port      string
	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	DBSSLMode string
}

// Load reads environment variables and returns an initialized Config struct.
func Load() Config {
	return Config{
		Port:      getEnv("PORT", defaultPort),
		DBHost:    getEnv("DB_HOST", defaultDBHost),
		DBPort:    getEnv("DB_PORT", defaultDBPort),
		DBUser:    getEnv("DB_USER", defaultDBUser),
		DBPass:    getEnv("DB_PASSWORD", defaultDBPass),
		DBName:    getEnv("DB_NAME", defaultDBName),
		DBSSLMode: getEnv("DB_SSLMODE", defaultDBSSLMode),
	}
}

// DSN builds the PostgreSQL Data Source Name string.
func (c Config) DSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		c.DBHost, c.DBUser, c.DBPass, c.DBName, c.DBPort, c.DBSSLMode,
	)
}

func getEnv(key, fallback string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return fallback
}
