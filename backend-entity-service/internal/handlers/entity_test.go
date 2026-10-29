package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/handlers"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/models"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/repository"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/server"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/datatypes"
)

type fakeEntityStore struct {
	entities map[uuid.UUID]models.Entity
	types    map[string]struct{}
	pingErr  error
	forceErr error
}

func newFakeEntityStore() *fakeEntityStore {
	id1 := uuid.MustParse("e4b2d184-7a13-4c91-95bc-79f67a214152")
	desc := "Kendaraan operasional rute Jakarta - Bogor"
	types := make(map[string]struct{})
	for _, d := range models.DefaultEntityTypes() {
		types[d] = struct{}{}
	}
	return &fakeEntityStore{
		types: types,
		entities: map[uuid.UUID]models.Entity{
			id1: {
				ID:          id1,
				Name:        "Armada Truk Logistik 01",
				Type:        "vehicle",
				Status:      models.StatusActive,
				Latitude:    -6.2087634,
				Longitude:   106.845599,
				Description: &desc,
				Metadata:    datatypes.JSON([]byte(`{"speed_kmh":45}`)),
				CreatedAt:   time.Now().UTC(),
				UpdatedAt:   time.Now().UTC(),
			},
		},
	}
}

func (f *fakeEntityStore) Ping(_ context.Context) error {
	return f.pingErr
}

func (f *fakeEntityStore) FindAll(_ context.Context, filter models.EntityFilter) ([]models.Entity, error) {
	if f.forceErr != nil {
		return nil, f.forceErr
	}
	res := make([]models.Entity, 0, len(f.entities))
	for _, e := range f.entities {
		if filter.Type != "" && !strings.EqualFold(e.Type, filter.Type) {
			continue
		}
		if filter.Status != "" && e.Status != filter.Status {
			continue
		}
		if filter.Search != "" && !strings.Contains(strings.ToLower(e.Name), strings.ToLower(filter.Search)) {
			continue
		}
		res = append(res, e)
	}
	return res, nil
}

func (f *fakeEntityStore) FindByID(_ context.Context, id uuid.UUID) (models.Entity, error) {
	if f.forceErr != nil {
		return models.Entity{}, f.forceErr
	}
	entity, ok := f.entities[id]
	if !ok {
		return models.Entity{}, repository.ErrEntityNotFound
	}
	return entity, nil
}

func (f *fakeEntityStore) Create(_ context.Context, entity models.Entity) (models.Entity, error) {
	if f.forceErr != nil {
		return models.Entity{}, f.forceErr
	}
	now := time.Now().UTC()
	entity.CreatedAt = now
	entity.UpdatedAt = now
	f.entities[entity.ID] = entity
	f.types[entity.Type] = struct{}{}
	return entity, nil
}

func (f *fakeEntityStore) Update(_ context.Context, entity models.Entity) (models.Entity, error) {
	if f.forceErr != nil {
		return models.Entity{}, f.forceErr
	}
	if _, ok := f.entities[entity.ID]; !ok {
		return models.Entity{}, repository.ErrEntityNotFound
	}
	f.entities[entity.ID] = entity
	f.types[entity.Type] = struct{}{}
	return entity, nil
}

func (f *fakeEntityStore) Delete(_ context.Context, id uuid.UUID) error {
	if f.forceErr != nil {
		return f.forceErr
	}
	if _, ok := f.entities[id]; !ok {
		return repository.ErrEntityNotFound
	}
	delete(f.entities, id)
	return nil
}

func (f *fakeEntityStore) FindDistinctTypes(_ context.Context) ([]string, error) {
	if f.forceErr != nil {
		return nil, f.forceErr
	}
	set := make(map[string]struct{})
	for k := range f.types {
		set[k] = struct{}{}
	}
	for _, e := range f.entities {
		set[e.Type] = struct{}{}
	}
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out, nil
}

func (f *fakeEntityStore) DeleteType(_ context.Context, typeName string) (int64, error) {
	if f.forceErr != nil {
		return 0, f.forceErr
	}
	var count int64
	for _, e := range f.entities {
		if strings.EqualFold(e.Type, typeName) {
			count++
		}
	}
	if count > 0 {
		return count, repository.ErrTypeInUse
	}
	delete(f.types, strings.ToLower(typeName))
	return 0, nil
}

func setupTestRouter(store handlers.EntityStore) *gin.Engine {
	gin.SetMode(gin.TestMode)
	h := handlers.NewEntityHandler(store)
	srv := server.NewServer(h, server.WithPort("8080"))
	return srv.Engine()
}

func TestHealthCheck_SuccessAndFailure(t *testing.T) {
	store := newFakeEntityStore()
	router := setupTestRouter(store)

	t.Run("200 OK when database is healthy", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp models.ApiResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.True(t, resp.Success)
	})

	t.Run("500 Internal Server Error when database ping fails", func(t *testing.T) {
		store.pingErr = errors.New("connection refused")
		defer func() { store.pingErr = nil }()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		var errResp models.ApiErrorResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &errResp))
		assert.False(t, errResp.Success)
		assert.Equal(t, "DATABASE_UNAVAILABLE", errResp.Error.Code)
	})
}

func TestGetAllEntities(t *testing.T) {
	store := newFakeEntityStore()
	router := setupTestRouter(store)

	t.Run("200 OK returns list of entities", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/entities?type=vehicle&status=active", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp struct {
			Success bool            `json:"success"`
			Data    []models.Entity `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.True(t, resp.Success)
		assert.Len(t, resp.Data, 1)
		assert.Equal(t, "Armada Truk Logistik 01", resp.Data[0].Name)
	})

	t.Run("400 Bad Request on invalid status query parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/entities?status=unknown_status", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var errResp models.ApiErrorResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &errResp))
		assert.False(t, errResp.Success)
		assert.Equal(t, "INVALID_QUERY_PARAMETER", errResp.Error.Code)
	})
}

func TestCreateEntity_ValidationAndSuccess(t *testing.T) {
	store := newFakeEntityStore()
	router := setupTestRouter(store)

	t.Run("201 Created with custom dynamic type", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":        "Weather Station Alpha",
			"type":        "weather_radar",
			"status":      "active",
			"latitude":    -6.1950002,
			"longitude":   106.8230005,
			"description": "Radar cuaca bandara",
			"metadata": map[string]interface{}{
				"range_km": 120,
			},
		}
		body, err := json.Marshal(payload)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/entities", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var resp struct {
			Success bool          `json:"success"`
			Data    models.Entity `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.True(t, resp.Success)
		assert.Equal(t, "weather_radar", resp.Data.Type)
		assert.InDelta(t, -6.1950002, resp.Data.Latitude, 0.0001)

		// Verify dynamic type appears in GET /api/v1/entities/types
		typeReq := httptest.NewRequest(http.MethodGet, "/api/v1/entities/types", nil)
		typeW := httptest.NewRecorder()
		router.ServeHTTP(typeW, typeReq)
		assert.Equal(t, http.StatusOK, typeW.Code)
		assert.Contains(t, typeW.Body.String(), "weather_radar")
	})

	t.Run("400 Bad Request when latitude is out of bounds", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":      "Invalid Coord Entity",
			"type":      "vehicle",
			"status":    "active",
			"latitude":  105.5, // Invalid: > 90
			"longitude": 106.8,
		}
		body, err := json.Marshal(payload)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/entities", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var errResp models.ApiErrorResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &errResp))
		assert.False(t, errResp.Success)
		assert.Equal(t, "VALIDATION_FAILED", errResp.Error.Code)
		assert.NotEmpty(t, errResp.Error.Details)
	})
}

func TestGetUpdateDeleteEntityByID(t *testing.T) {
	store := newFakeEntityStore()
	router := setupTestRouter(store)
	targetID := "e4b2d184-7a13-4c91-95bc-79f67a214152"

	t.Run("GET /api/v1/entities/:id returns 200 OK", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/entities/"+targetID, nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("GET /api/v1/entities/:id returns 400 on malformed UUID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/entities/not-a-uuid", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("PUT /api/v1/entities/:id updates entity", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":      "Armada Truk Logistik 01 - Updated",
			"type":      "vehicle",
			"status":    "maintenance",
			"latitude":  -6.210000,
			"longitude": 106.850000,
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPut, "/api/v1/entities/"+targetID, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp struct {
			Data models.Entity `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "Armada Truk Logistik 01 - Updated", resp.Data.Name)
		assert.Equal(t, "maintenance", resp.Data.Status)
	})

	t.Run("DELETE /api/v1/entities/:id removes entity and subsequent GET returns 404", func(t *testing.T) {
		delReq := httptest.NewRequest(http.MethodDelete, "/api/v1/entities/"+targetID, nil)
		delW := httptest.NewRecorder()
		router.ServeHTTP(delW, delReq)
		assert.Equal(t, http.StatusOK, delW.Code)

		getReq := httptest.NewRequest(http.MethodGet, "/api/v1/entities/"+targetID, nil)
		getW := httptest.NewRecorder()
		router.ServeHTTP(getW, getReq)
		assert.Equal(t, http.StatusNotFound, getW.Code)
	})
}

func TestDeleteEntityType(t *testing.T) {
	store := newFakeEntityStore()
	router := setupTestRouter(store)

	t.Run("409 Conflict when deleting a type still used by an active entity", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/entities/types/vehicle", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusConflict, w.Code)
		var errResp models.ApiErrorResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &errResp))
		assert.Equal(t, "TYPE_IN_USE", errResp.Error.Code)
	})

	t.Run("200 OK when deleting an unused type", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/entities/types/drone", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		typeReq := httptest.NewRequest(http.MethodGet, "/api/v1/entities/types", nil)
		typeW := httptest.NewRecorder()
		router.ServeHTTP(typeW, typeReq)
		assert.NotContains(t, typeW.Body.String(), "drone")
	})
}
