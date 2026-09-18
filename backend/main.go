package main

import (
	"fmt"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"live-polling-backend/config"
	"live-polling-backend/routes"
)

func main() {

	// Load .env file
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Warning: .env file not found")
	}

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
			"https://lakshmipriyas-25.github.io",
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

	// Get PORT from environment
	port := os.Getenv("PORT")

	// Use 8080 locally if PORT is not set
	if port == "" {
		port = "8080"
	}

	fmt.Println("===================================")
	fmt.Println("Live Polling Backend")
	fmt.Println("Server: 0.0.0.0:" + port)
	fmt.Println("===================================")

	// Start server
	err = router.Run("0.0.0.0:" + port)
	if err != nil {
		panic(err)
	}
}