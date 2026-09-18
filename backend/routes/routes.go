package routes

import (
	"github.com/gin-gonic/gin"

	"live-polling-backend/controllers"
)

func SetupRoutes(router *gin.Engine) {

	// ================================
	// POLL ROUTES
	// ================================

	// Create a new poll
	router.POST(
		"/api/polls",
		controllers.CreatePoll,
	)

	// Get all polls
	router.GET(
		"/api/polls",
		controllers.GetPolls,
	)

	// Get a single poll
	router.GET(
		"/api/polls/:id",
		controllers.GetPoll,
	)

	// Vote for a poll option
	router.POST(
		"/api/polls/:id/vote/:optionId",
		controllers.VotePoll,
	)

	// Delete a poll
	router.DELETE(
		"/api/polls/:id",
		controllers.DeletePoll,
	)
}