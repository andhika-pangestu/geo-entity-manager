package database

import (
	"fmt"
	"strings"
	"time"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/models"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Seed populates the database with initial geospatial entities if the table is empty.
func Seed(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.Entity{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to count existing entities for seeding: %w", err)
	}
	if count > 0 {
		return seedInitialTypes(db)
	}

	initialEntities := []models.Entity{
		{
			ID:          uuid.MustParse("e4b2d184-7a13-4c91-95bc-79f67a214152"),
			Name:        "Armada Truk Logistik A-01",
			Type:        "vehicle",
			Status:      models.StatusActive,
			Latitude:    -6.2087634,
			Longitude:   106.8455990,
			Description: strPtr("Kendaraan angkut logistik utama koridor Jakarta Pusat - Pelabuhan Tanjung Priok"),
			Metadata:    datatypes.JSON([]byte(`{"speed_kmh": 52, "fuel_percentage": 84, "plate_number": "B 9412 TXU", "driver": "Hendra Wijaya"}`)),
		},
		{
			ID:          uuid.MustParse("7fa84e2a-19c2-4eb5-8e11-f1dbba8e68cf"),
			Name:        "Sensor Kualitas Udara - Bundaran HI",
			Type:        "iot_sensor",
			Status:      models.StatusActive,
			Latitude:    -6.1950002,
			Longitude:   106.8230005,
			Description: strPtr("Node sensor pemantau PM2.5, CO2, suhu, dan kelembapan udara real-time"),
			Metadata:    datatypes.JSON([]byte(`{"pm25": 34.2, "temperature_c": 29.5, "humidity_pct": 68, "firmware": "v2.4.1"}`)),
		},
		{
			ID:          uuid.MustParse("3c91a450-8b2f-4e1a-9a21-6c84a9120e11"),
			Name:        "Pusat Kendali Distribusi Sudirman",
			Type:        "facility",
			Status:      models.StatusActive,
			Latitude:    -6.2245011,
			Longitude:   106.8096521,
			Description: strPtr("Fasilitas hub pemantauan operasional dan gudang transit regional"),
			Metadata:    datatypes.JSON([]byte(`{"capacity_tons": 250, "personnel_count": 42, "power_backup": "online"}`)),
		},
		{
			ID:          uuid.MustParse("9d12b761-4c3e-4f92-b102-8e73b1045f22"),
			Name:        "Drone Patroli Infrastruktur D-04",
			Type:        "drone",
			Status:      models.StatusMaintenance,
			Latitude:    -6.1753924,
			Longitude:   106.8271528,
			Description: strPtr("Unit UAV pemetaan termal dan inspeksi jaringan area Monas - Gambir"),
			Metadata:    datatypes.JSON([]byte(`{"battery_pct": 18, "altitude_m": 0, "maintenance_note": "Kalibrasi gimbal optik"}`)),
		},
		{
			ID:          uuid.MustParse("5a44c890-1d7b-4a33-8c19-2f55e8019d33"),
			Name:        "Gateway Telemetri Banjir - Manggarai",
			Type:        "iot_device",
			Status:      models.StatusInactive,
			Latitude:    -6.2098412,
			Longitude:   106.8501294,
			Description: strPtr("Perangkat telemetri tinggi muka air pintu air Manggarai"),
			Metadata:    datatypes.JSON([]byte(`{"water_level_cm": 610, "signal_dbm": -78, "last_ping": "2026-10-28T09:15:00Z"}`)),
		},
	}

	if err := db.Create(&initialEntities).Error; err != nil {
		return fmt.Errorf("failed to seed initial entities: %w", err)
	}

	return seedInitialTypes(db)
}

func seedInitialTypes(db *gorm.DB) error {
	var typeCount int64
	if err := db.Model(&models.EntityType{}).Count(&typeCount).Error; err != nil {
		return fmt.Errorf("failed to count entity_types: %w", err)
	}
	if typeCount > 0 {
		return nil
	}

	typeSet := make(map[string]struct{})
	for _, t := range models.DefaultEntityTypes() {
		typeSet[t] = struct{}{}
	}

	var activeTypes []string
	if err := db.Model(&models.Entity{}).Distinct("type").Pluck("type", &activeTypes).Error; err != nil {
		return fmt.Errorf("failed to read active entity types for seeding: %w", err)
	}
	for _, t := range activeTypes {
		trimmed := strings.ToLower(strings.TrimSpace(t))
		if trimmed != "" {
			typeSet[trimmed] = struct{}{}
		}
	}

	now := time.Now().UTC()
	records := make([]models.EntityType, 0, len(typeSet))
	for name := range typeSet {
		records = append(records, models.EntityType{
			Name:      name,
			CreatedAt: now,
		})
	}

	if len(records) > 0 {
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&records).Error; err != nil {
			return fmt.Errorf("failed to seed entity_types: %w", err)
		}
	}
	return nil
}

func strPtr(s string) *string {
	return &s
}
