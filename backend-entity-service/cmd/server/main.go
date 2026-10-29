package main

import (
	"log"

	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/config"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/database"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/handlers"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/repository"
	"github.com/dhikapng/geo-entity-manager/backend-entity-service/internal/server"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database initialization error: %v", err)
	}

	if err := database.Seed(db); err != nil {
		log.Fatalf("database seeding error: %v", err)
	}

	repo := repository.NewPostgresEntityRepository(db)
	entityHandler := handlers.NewEntityHandler(repo)
	srv := server.NewServer(entityHandler, server.WithPort(cfg.Port))

	log.Printf("Geo Entity Manager Backend listening on :%s", cfg.Port)
	if err := srv.Run(); err != nil {
		log.Fatalf("server runtime error: %v", err)
	}
}
