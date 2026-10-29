package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/models"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/repository"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/validator"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// EntityStore defines data access and health check operations required by EntityHandler.
type EntityStore interface {
	Ping(ctx context.Context) error
	FindAll(ctx context.Context, filter models.EntityFilter) ([]models.Entity, error)
	FindByID(ctx context.Context, id uuid.UUID) (models.Entity, error)
	FindDistinctTypes(ctx context.Context) ([]string, error)
	DeleteType(ctx context.Context, typeName string) (int64, error)
	Create(ctx context.Context, entity models.Entity) (models.Entity, error)
	Update(ctx context.Context, entity models.Entity) (models.Entity, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// EntityHandler handles HTTP REST requests for geospatial entities.
type EntityHandler struct {
	store EntityStore
}

// NewEntityHandler creates a new EntityHandler with the injected EntityStore interface.
func NewEntityHandler(store EntityStore) *EntityHandler {
	return &EntityHandler{store: store}
}

// HealthCheck handles GET /api/v1/health.
func (h *EntityHandler) HealthCheck(c *gin.Context) {
	if err := h.store.Ping(c.Request.Context()); err != nil {
		respondError(c, http.StatusInternalServerError, "DATABASE_UNAVAILABLE", "Database connection pool check failed", nil)
		return
	}

	respondSuccess(c, http.StatusOK, "Service is healthy", gin.H{
		"status":    "UP",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"database":  "connected",
	})
}

// GetAll handles GET /api/v1/entities.
func (h *EntityHandler) GetAll(c *gin.Context) {
	statusFilter := strings.TrimSpace(c.Query("status"))
	if statusFilter != "" && !models.IsValidStatus(statusFilter) {
		respondError(c, http.StatusBadRequest, "INVALID_QUERY_PARAMETER", "Invalid query parameter supplied", []models.ValidationErrorDetail{
			{
				Field: "status",
				Issue: "status must be one of: active, inactive, maintenance",
			},
		})
		return
	}

	filter := models.EntityFilter{
		Type:   c.Query("type"),
		Status: statusFilter,
		Search: c.Query("search"),
	}

	entities, err := h.store.FindAll(c.Request.Context(), filter)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Failed to fetch entity records from database", nil)
		return
	}

	respondSuccess(c, http.StatusOK, "Entities retrieved successfully", entities)
}

// GetTypes handles GET /api/v1/entities/types.
func (h *EntityHandler) GetTypes(c *gin.Context) {
	types, err := h.store.FindDistinctTypes(c.Request.Context())
	if err != nil {
		respondError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Failed to aggregate distinct entity types from database", nil)
		return
	}

	respondSuccess(c, http.StatusOK, "Entity types retrieved successfully", types)
}

// DeleteType handles DELETE /api/v1/entities/types/:type.
func (h *EntityHandler) DeleteType(c *gin.Context) {
	typeName := strings.ToLower(strings.TrimSpace(c.Param("type")))
	if typeName == "" {
		respondError(c, http.StatusBadRequest, "VALIDATION_FAILED", "Type name is required", nil)
		return
	}

	activeCount, err := h.store.DeleteType(c.Request.Context(), typeName)
	if err != nil {
		if errors.Is(err, repository.ErrTypeInUse) {
			respondError(
				c,
				http.StatusConflict,
				"TYPE_IN_USE",
				fmt.Sprintf("Tipe '%s' tidak dapat dihapus karena masih digunakan oleh %d entitas aktif", typeName, activeCount),
				nil,
			)
			return
		}
		respondError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Failed to delete entity type", nil)
		return
	}

	respondSuccess(c, http.StatusOK, "Entity type deleted successfully", gin.H{
		"type": typeName,
	})
}

// GetByID handles GET /api/v1/entities/:id.
func (h *EntityHandler) GetByID(c *gin.Context) {
	id, ok := parseUUIDParam(c)
	if !ok {
		return
	}

	entity, err := h.store.FindByID(c.Request.Context(), id)
	if err != nil {
		respondRepoError(c, err, "Entity with specified ID does not exist", "An error occurred while retrieving entity")
		return
	}

	respondSuccess(c, http.StatusOK, "Entity retrieved successfully", entity)
}

// Create handles POST /api/v1/entities.
func (h *EntityHandler) Create(c *gin.Context) {
	var input models.EntityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		details := validator.FormatValidationErrors(err)
		respondError(c, http.StatusBadRequest, "VALIDATION_FAILED", "Input validation failed on request body", details)
		return
	}

	newEntity, err := input.ToEntity()
	if err != nil {
		respondError(c, http.StatusBadRequest, "VALIDATION_FAILED", "Invalid metadata JSON structure", nil)
		return
	}

	created, err := h.store.Create(c.Request.Context(), newEntity)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Failed to persist entity to database", nil)
		return
	}

	respondSuccess(c, http.StatusCreated, "Entity created successfully", created)
}

// Update handles PUT /api/v1/entities/:id.
func (h *EntityHandler) Update(c *gin.Context) {
	id, ok := parseUUIDParam(c)
	if !ok {
		return
	}

	var input models.EntityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		details := validator.FormatValidationErrors(err)
		respondError(c, http.StatusBadRequest, "VALIDATION_FAILED", "Invalid request payload attributes", details)
		return
	}

	existing, err := h.store.FindByID(c.Request.Context(), id)
	if err != nil {
		respondRepoError(c, err, "Target entity for update not found", "Failed to update record in database")
		return
	}

	updatedEntity, err := input.ApplyTo(existing)
	if err != nil {
		respondError(c, http.StatusBadRequest, "VALIDATION_FAILED", "Invalid metadata JSON structure", nil)
		return
	}

	saved, err := h.store.Update(c.Request.Context(), updatedEntity)
	if err != nil {
		respondRepoError(c, err, "Target entity for update not found", "Failed to update record in database")
		return
	}

	respondSuccess(c, http.StatusOK, "Entity updated successfully", saved)
}

// Delete handles DELETE /api/v1/entities/:id.
func (h *EntityHandler) Delete(c *gin.Context) {
	id, ok := parseUUIDParam(c)
	if !ok {
		return
	}

	if err := h.store.Delete(c.Request.Context(), id); err != nil {
		respondRepoError(c, err, "Target entity for deletion not found", "Failed to delete entity record from database")
		return
	}

	respondSuccess(c, http.StatusOK, "Entity deleted successfully", gin.H{
		"id": id.String(),
	})
}

func respondRepoError(c *gin.Context, err error, notFoundMsg, internalMsg string) {
	if errors.Is(err, repository.ErrEntityNotFound) {
		respondError(c, http.StatusNotFound, "ENTITY_NOT_FOUND", notFoundMsg, nil)
		return
	}
	respondError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", internalMsg, nil)
}

func parseUUIDParam(c *gin.Context) (uuid.UUID, bool) {
	rawID := c.Param("id")
	parsed, err := uuid.Parse(rawID)
	if err != nil {
		respondError(c, http.StatusBadRequest, "INVALID_UUID", "ID supplied is not a valid UUIDv4", []models.ValidationErrorDetail{
			{
				Field: "id",
				Issue: "must be formatted as valid UUIDv4",
			},
		})
		return uuid.Nil, false
	}
	return parsed, true
}

func respondSuccess(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(status, models.ApiResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func respondError(c *gin.Context, status int, code, message string, details []models.ValidationErrorDetail) {
	if details == nil {
		details = []models.ValidationErrorDetail{}
	}
	c.JSON(status, models.ApiErrorResponse{
		Success: false,
		Error: models.ApiErrorDetail{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}
