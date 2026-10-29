package models

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	StatusActive      = "active"
	StatusInactive    = "inactive"
	StatusMaintenance = "maintenance"
)

// DefaultEntityTypes returns a fresh slice of default system entity type suggestions.
func DefaultEntityTypes() []string {
	return []string{"facility", "iot_device", "iot_sensor", "vehicle", "drone"}
}

// EntityType represents a registered dynamic entity category stored in PostgreSQL.
type EntityType struct {
	Name      string    `gorm:"type:varchar(50);primaryKey" json:"name"`
	CreatedAt time.Time `gorm:"not null" json:"created_at"`
}

// TableName explicitly sets the PostgreSQL table name for entity types.
func (EntityType) TableName() string {
	return "entity_types"
}

// IsValidStatus checks whether a given status string is one of the allowed operational statuses.
func IsValidStatus(status string) bool {
	switch status {
	case StatusActive, StatusInactive, StatusMaintenance:
		return true
	default:
		return false
	}
}

// Entity represents a geospatial object stored in the PostgreSQL entities table.
type Entity struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Type        string         `gorm:"type:varchar(50);not null;index:idx_entities_type" json:"type"`
	Status      string         `gorm:"type:varchar(30);not null;default:'active';index:idx_entities_status;check:chk_entities_status,status IN ('active','inactive','maintenance')" json:"status"`
	Latitude    float64        `gorm:"type:double precision;not null;index:idx_entities_coordinates,priority:1;check:chk_entities_latitude,latitude >= -90.0 AND latitude <= 90.0" json:"latitude"`
	Longitude   float64        `gorm:"type:double precision;not null;index:idx_entities_coordinates,priority:2;check:chk_entities_longitude,longitude >= -180.0 AND longitude <= 180.0" json:"longitude"`
	Description *string        `gorm:"type:text" json:"description"`
	Metadata    datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'" json:"metadata"`
	CreatedAt   time.Time      `gorm:"not null" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"not null" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index:idx_entities_deleted_at" json:"-"`
}

// TableName explicitly sets the PostgreSQL table name.
func (Entity) TableName() string {
	return "entities"
}

// BeforeCreate ensures a UUIDv4 is assigned and Metadata defaults to an empty JSON object.
func (e *Entity) BeforeCreate(_ *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	if len(e.Metadata) == 0 {
		e.Metadata = datatypes.JSON([]byte("{}"))
	}
	return nil
}

// EntityInput represents the validated request payload for creating or updating a geospatial entity.
type EntityInput struct {
	Name        string                 `json:"name" binding:"required,min=1,max=100"`
	Type        string                 `json:"type" binding:"required,min=2,max=50"`
	Status      string                 `json:"status" binding:"required,oneof=active inactive maintenance"`
	Latitude    *float64               `json:"latitude" binding:"required,gte=-90,lte=90"`
	Longitude   *float64               `json:"longitude" binding:"required,gte=-180,lte=180"`
	Description *string                `json:"description" binding:"omitempty,max=500"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// ToEntity creates a new immutable Entity struct from the validated EntityInput.
func (in EntityInput) ToEntity() (Entity, error) {
	metaBytes, err := encodeMetadata(in.Metadata, []byte("{}"))
	if err != nil {
		return Entity{}, fmt.Errorf("failed to marshal entity metadata: %w", err)
	}

	return Entity{
		ID:          uuid.New(),
		Name:        in.Name,
		Type:        in.Type,
		Status:      in.Status,
		Latitude:    *in.Latitude,
		Longitude:   *in.Longitude,
		Description: in.Description,
		Metadata:    datatypes.JSON(metaBytes),
	}, nil
}

// ApplyTo returns a new updated copy of an existing Entity without mutating the original in place.
func (in EntityInput) ApplyTo(existing Entity) (Entity, error) {
	fallback := []byte("{}")
	if len(existing.Metadata) > 0 {
		fallback = existing.Metadata
	}

	metaBytes, err := encodeMetadata(in.Metadata, fallback)
	if err != nil {
		return Entity{}, fmt.Errorf("failed to marshal updated entity metadata: %w", err)
	}

	return Entity{
		ID:          existing.ID,
		Name:        in.Name,
		Type:        in.Type,
		Status:      in.Status,
		Latitude:    *in.Latitude,
		Longitude:   *in.Longitude,
		Description: in.Description,
		Metadata:    datatypes.JSON(metaBytes),
		CreatedAt:   existing.CreatedAt,
		UpdatedAt:   time.Now().UTC(),
	}, nil
}

func encodeMetadata(metadata map[string]interface{}, fallback []byte) ([]byte, error) {
	if metadata == nil {
		return fallback, nil
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return nil, fmt.Errorf("json marshal error: %w", err)
	}
	return encoded, nil
}

// EntityFilter holds query parameters for filtering entities.
type EntityFilter struct {
	Type   string
	Status string
	Search string
}

// ValidationErrorDetail describes a specific field validation failure.
type ValidationErrorDetail struct {
	Field string `json:"field"`
	Issue string `json:"issue"`
}

// ApiErrorDetail represents the error payload inside an API error response.
type ApiErrorDetail struct {
	Code    string                  `json:"code"`
	Message string                  `json:"message"`
	Details []ValidationErrorDetail `json:"details"`
}

// ApiResponse is the standard envelope for successful REST responses.
type ApiResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// ApiErrorResponse is the standard envelope for failed REST responses.
type ApiErrorResponse struct {
	Success bool           `json:"success"`
	Error   ApiErrorDetail `json:"error"`
}
