package controllers

import "github.com/gin-gonic/gin"

func HealthCheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":  "success",
		"message": "Live Polling API is running",
	})
}
