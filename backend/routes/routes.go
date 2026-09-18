package routes

import (
	"github.com/gin-gonic/gin"

	"live-polling-backend/controllers"
)

func SetupRoutes(router *gin.Engine) {

	// Create a new poll
	router.POST("/api/polls", controllers.CreatePoll)

	// Get all polls
	router.GET("/api/polls", controllers.GetPolls)

	// Get a single poll
	router.GET("/api/polls/:id", controllers.GetPoll)

	// Vote for an option
	router.POST(
		"/api/polls/:id/vote/:optionId",
		controllers.VotePoll,
	)

	// Real-time poll updates using Server-Sent Events
	router.GET(
		"/api/polls/:id/stream",
		controllers.PollStream,
	)
}
