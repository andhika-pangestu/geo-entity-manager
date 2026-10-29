package server

import (
	"fmt"
	"net/http"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/handlers"
	"github.com/gin-gonic/gin"
)

const defaultServerPort = "8080"

// Server wraps the Gin HTTP engine and server configuration.
type Server struct {
	port   string
	engine *gin.Engine
}

// Option defines a functional option for configuring Server.
type Option func(*Server)

// WithPort configures the HTTP listening port for the server.
func WithPort(port string) Option {
	return func(s *Server) {
		if port != "" {
			s.port = port
		}
	}
}

// NewServer constructs a configured Server using functional options.
func NewServer(entityHandler *handlers.EntityHandler, opts ...Option) *Server {
	s := &Server{
		port:   defaultServerPort,
		engine: gin.New(),
	}

	for _, opt := range opts {
		opt(s)
	}

	s.engine.Use(gin.Logger(), gin.Recovery(), corsMiddleware())
	s.registerRoutes(entityHandler)
	return s
}

// Engine returns the underlying Gin engine.
func (s *Server) Engine() *gin.Engine {
	return s.engine
}

// Run starts the HTTP server on the configured port.
func (s *Server) Run() error {
	addr := fmt.Sprintf(":%s", s.port)
	if err := s.engine.Run(addr); err != nil {
		return fmt.Errorf("failed to run HTTP server on %s: %w", addr, err)
	}
	return nil
}

func (s *Server) registerRoutes(h *handlers.EntityHandler) {
	v1 := s.engine.Group("/api/v1")
	{
		v1.GET("/health", h.HealthCheck)
		v1.GET("/entities", h.GetAll)
		v1.GET("/entities/types", h.GetTypes)
		v1.DELETE("/entities/types/:type", h.DeleteType)
		v1.GET("/entities/:id", h.GetByID)
		v1.POST("/entities", h.Create)
		v1.PUT("/entities/:id", h.Update)
		v1.DELETE("/entities/:id", h.Delete)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
