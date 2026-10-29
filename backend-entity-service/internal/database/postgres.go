package database

import (
	"fmt"
	"time"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/config"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const (
	maxIdleConns    = 10
	maxOpenConns    = 50
	connMaxLifetime = 30 * time.Minute
)

// Connect initializes a PostgreSQL GORM connection and runs schema migrations.
func Connect(cfg config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to access sql.DB connection pool: %w", err)
	}

	sqlDB.SetMaxIdleConns(maxIdleConns)
	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetConnMaxLifetime(connMaxLifetime)

	if err := migrateSchema(db); err != nil {
		return nil, fmt.Errorf("failed to migrate database schema: %w", err)
	}

	return db, nil
}

func migrateSchema(db *gorm.DB) error {
	if err := db.AutoMigrate(&models.Entity{}, &models.EntityType{}); err != nil {
		return fmt.Errorf("failed GORM automigrate: %w", err)
	}

	ddlStatements := []string{
		`CREATE INDEX IF NOT EXISTS idx_entities_metadata ON entities USING GIN (metadata)`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_entities_status') THEN
				ALTER TABLE entities ADD CONSTRAINT chk_entities_status CHECK (status IN ('active', 'inactive', 'maintenance'));
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_entities_latitude') THEN
				ALTER TABLE entities ADD CONSTRAINT chk_entities_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_entities_longitude') THEN
				ALTER TABLE entities ADD CONSTRAINT chk_entities_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0);
			END IF;
		END $$;`,
	}

	for _, stmt := range ddlStatements {
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("failed to execute schema constraint statement: %w", err)
		}
	}

	return nil
}
