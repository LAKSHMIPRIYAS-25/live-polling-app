package main

import (
	"fmt"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"live-polling-backend/config"
	"live-polling-backend/routes"
)

func main() {

	// Connect to MongoDB
	config.ConnectDB()

	// Connect to Redis / Memurai
	config.ConnectRedis()

	// Create Gin router
	router := gin.Default()

	// CORS configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
		},

		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
		},

		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Voter-ID",
		},

		AllowCredentials: true,
	}))

	// Setup API routes
	routes.SetupRoutes(router)

	fmt.Println("===================================")
	fmt.Println("Live Polling Backend")
	fmt.Println("Server: http://localhost:8080")
	fmt.Println("===================================")

	// Start server
	router.Run(":8080")
}
