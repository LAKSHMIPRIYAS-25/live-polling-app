package controllers

import (
	"context"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"live-polling-backend/config"
)

func PollStream(c *gin.Context) {

	pollID := c.Param("id")
	channel := "poll:" + pollID

	pubsub := config.RedisClient.Subscribe(
		context.Background(),
		channel,
	)

	defer pubsub.Close()

	// Confirm Redis subscription
	_, err := pubsub.Receive(context.Background())

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to connect to live poll stream",
		})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	c.Stream(func(w io.Writer) bool {

		message, ok := <-pubsub.Channel()

		if !ok {
			return false
		}

		c.SSEvent("poll-update", message.Payload)

		return true
	})
}
