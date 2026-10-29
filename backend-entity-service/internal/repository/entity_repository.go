package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrEntityNotFound indicates the requested entity record does not exist.
var ErrEntityNotFound = errors.New("entity not found")

// ErrTypeInUse indicates an entity type cannot be deleted because active entities still reference it.
var ErrTypeInUse = errors.New("entity type is still in use")

// PostgresEntityRepository implements persistence operations for Entity using GORM.
type PostgresEntityRepository struct {
	db *gorm.DB
}

// NewPostgresEntityRepository constructs a new PostgresEntityRepository with the injected GORM DB.
func NewPostgresEntityRepository(db *gorm.DB) *PostgresEntityRepository {
	return &PostgresEntityRepository{db: db}
}

// Ping verifies database connectivity.
func (r *PostgresEntityRepository) Ping(ctx context.Context) error {
	sqlDB, err := r.db.DB()
	if err != nil {
		return fmt.Errorf("failed to acquire underlying sql.DB: %w", err)
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}
	return nil
}

// FindAll retrieves entities matching the optional type, status, and search filters.
func (r *PostgresEntityRepository) FindAll(ctx context.Context, filter models.EntityFilter) ([]models.Entity, error) {
	query := r.db.WithContext(ctx).Model(&models.Entity{})

	if trimmedType := strings.TrimSpace(filter.Type); trimmedType != "" {
		query = query.Where("LOWER(type) = LOWER(?)", trimmedType)
	}
	if trimmedStatus := strings.TrimSpace(filter.Status); trimmedStatus != "" {
		query = query.Where("status = ?", trimmedStatus)
	}
	if trimmedSearch := strings.TrimSpace(filter.Search); trimmedSearch != "" {
		likePattern := "%" + trimmedSearch + "%"
		query = query.Where("name ILIKE ? OR COALESCE(description, '') ILIKE ?", likePattern, likePattern)
	}

	var entities []models.Entity
	if err := query.Order("created_at DESC").Find(&entities).Error; err != nil {
		return nil, fmt.Errorf("failed to query entities: %w", err)
	}
	return entities, nil
}

// FindByID retrieves a single entity by its UUID.
func (r *PostgresEntityRepository) FindByID(ctx context.Context, id uuid.UUID) (models.Entity, error) {
	var entity models.Entity
	err := r.db.WithContext(ctx).First(&entity, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Entity{}, fmt.Errorf("failed to find entity %s: %w", id, ErrEntityNotFound)
		}
		return models.Entity{}, fmt.Errorf("failed to query entity %s: %w", id, err)
	}
	return entity, nil
}

// Create persists a new entity record in the database and ensures its type is registered.
func (r *PostgresEntityRepository) Create(ctx context.Context, entity models.Entity) (models.Entity, error) {
	if err := r.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.Entity{}, fmt.Errorf("failed to create entity: %w", err)
	}
	r.ensureTypeRegistered(ctx, entity.Type)
	return entity, nil
}

// Update saves changes to an existing entity record and ensures its type is registered.
func (r *PostgresEntityRepository) Update(ctx context.Context, entity models.Entity) (models.Entity, error) {
	result := r.db.WithContext(ctx).Model(&models.Entity{}).Where("id = ?", entity.ID).Updates(map[string]interface{}{
		"name":        entity.Name,
		"type":        entity.Type,
		"status":      entity.Status,
		"latitude":    entity.Latitude,
		"longitude":   entity.Longitude,
		"description": entity.Description,
		"metadata":    entity.Metadata,
		"updated_at":  entity.UpdatedAt,
	})
	if result.Error != nil {
		return models.Entity{}, fmt.Errorf("failed to update entity %s: %w", entity.ID, result.Error)
	}
	if result.RowsAffected == 0 {
		return models.Entity{}, fmt.Errorf("failed to update entity %s: %w", entity.ID, ErrEntityNotFound)
	}
	r.ensureTypeRegistered(ctx, entity.Type)
	return entity, nil
}

func (r *PostgresEntityRepository) ensureTypeRegistered(ctx context.Context, typeName string) {
	trimmed := strings.ToLower(strings.TrimSpace(typeName))
	if trimmed == "" {
		return
	}
	_ = r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(&models.EntityType{
		Name:      trimmed,
		CreatedAt: time.Now().UTC(),
	}).Error
}

// Delete soft-deletes an entity record by its UUID.
func (r *PostgresEntityRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&models.Entity{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete entity %s: %w", id, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("failed to delete entity %s: %w", id, ErrEntityNotFound)
	}
	return nil
}

// FindDistinctTypes returns a sorted list of unique entity types from entity_types and active entities.
func (r *PostgresEntityRepository) FindDistinctTypes(ctx context.Context) ([]string, error) {
	var registeredTypes []string
	if err := r.db.WithContext(ctx).Model(&models.EntityType{}).Pluck("name", &registeredTypes).Error; err != nil {
		return nil, fmt.Errorf("failed to query registered entity types: %w", err)
	}

	var dbTypes []string
	err := r.db.WithContext(ctx).
		Model(&models.Entity{}).
		Distinct("type").
		Pluck("type", &dbTypes).Error
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate distinct entity types: %w", err)
	}

	uniqueMap := make(map[string]struct{})
	for _, t := range registeredTypes {
		trimmed := strings.ToLower(strings.TrimSpace(t))
		if trimmed != "" {
			uniqueMap[trimmed] = struct{}{}
		}
	}
	for _, t := range dbTypes {
		trimmed := strings.ToLower(strings.TrimSpace(t))
		if trimmed != "" {
			uniqueMap[trimmed] = struct{}{}
		}
	}

	merged := make([]string, 0, len(uniqueMap))
	for k := range uniqueMap {
		merged = append(merged, k)
	}
	sort.Strings(merged)
	return merged, nil
}

// DeleteType removes a type from entity_types if no active entities are currently using it.
func (r *PostgresEntityRepository) DeleteType(ctx context.Context, typeName string) (int64, error) {
	trimmed := strings.ToLower(strings.TrimSpace(typeName))
	var activeCount int64
	if err := r.db.WithContext(ctx).
		Model(&models.Entity{}).
		Where("LOWER(type) = ?", trimmed).
		Count(&activeCount).Error; err != nil {
		return 0, fmt.Errorf("failed to count active entities for type %s: %w", trimmed, err)
	}
	if activeCount > 0 {
		return activeCount, fmt.Errorf("type %s is used by %d active entities: %w", trimmed, activeCount, ErrTypeInUse)
	}

	if err := r.db.WithContext(ctx).
		Where("LOWER(name) = ?", trimmed).
		Delete(&models.EntityType{}).Error; err != nil {
		return 0, fmt.Errorf("failed to delete entity type %s: %w", trimmed, err)
	}
	return 0, nil
}
