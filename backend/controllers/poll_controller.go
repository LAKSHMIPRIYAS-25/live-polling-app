package controllers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"

	"live-polling-backend/config"
	"live-polling-backend/models"
)

// CreatePoll creates a new poll
func CreatePoll(c *gin.Context) {

	var poll models.Poll

	// Read JSON request body
	if err := c.ShouldBindJSON(&poll); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
		})
		return
	}

	// Clean question
	poll.Question = strings.TrimSpace(poll.Question)

	// -----------------------------
	// Question validation
	// -----------------------------

	if poll.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Question is required",
		})
		return
	}

	if len(poll.Question) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Question must be at least 3 characters",
		})
		return
	}

	if len(poll.Question) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Question must not exceed 200 characters",
		})
		return
	}

	// -----------------------------
	// Option count validation
	// -----------------------------

	if len(poll.Options) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least 2 options are required",
		})
		return
	}

	if len(poll.Options) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Maximum 10 options are allowed",
		})
		return
	}

	// -----------------------------
	// Option validation
	// -----------------------------

	seenOptions := make(map[string]bool)

	for i := range poll.Options {

		// Remove unnecessary spaces
		poll.Options[i].Text = strings.TrimSpace(
			poll.Options[i].Text,
		)

		// Empty option check
		if poll.Options[i].Text == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "All options are required",
			})
			return
		}

		// Option length check
		if len(poll.Options[i].Text) > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Each option must not exceed 100 characters",
			})
			return
		}

		// Duplicate option check
		normalizedOption := strings.ToLower(
			poll.Options[i].Text,
		)

		if seenOptions[normalizedOption] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Duplicate options are not allowed",
			})
			return
		}

		seenOptions[normalizedOption] = true

		// -----------------------------
		// Generate option ID
		// -----------------------------

		poll.Options[i].ID = strings.TrimSpace(
			poll.Options[i].ID,
		)

		if poll.Options[i].ID == "" {
			poll.Options[i].ID = bson.NewObjectID().Hex()
		}

		// New poll always starts with 0 votes
		poll.Options[i].Votes = 0
	}

	// -----------------------------
	// Generate Poll ID
	// -----------------------------

	poll.ID = bson.NewObjectID()

	// Store creation time in UTC
	poll.CreatedAt = time.Now().UTC().Format(
		time.RFC3339,
	)

	// -----------------------------
	// Save to MongoDB
	// -----------------------------

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	_, err := collection.InsertOne(ctx, poll)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create poll",
		})
		return
	}

	// -----------------------------
	// Success response
	// -----------------------------

	c.JSON(http.StatusCreated, gin.H{
		"message": "Poll created successfully",
		"poll":    poll,
	})
}

// GetPolls returns all polls
func GetPolls(c *gin.Context) {

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	// Fetch all polls
	cursor, err := collection.Find(
		ctx,
		bson.M{},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch polls",
		})
		return
	}

	defer cursor.Close(ctx)

	var polls []models.Poll

	// Decode MongoDB results
	if err := cursor.All(ctx, &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode polls",
		})
		return
	}

	// Return empty array instead of null
	if polls == nil {
		polls = []models.Poll{}
	}

	c.JSON(http.StatusOK, gin.H{
		"polls": polls,
	})
}

// GetPoll returns one poll by ID
func GetPoll(c *gin.Context) {

	pollID := c.Param("id")

	// Convert string ID to MongoDB ObjectID
	objectID, err := bson.ObjectIDFromHex(pollID)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	var poll models.Poll

	// Find poll
	err = collection.FindOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	).Decode(&poll)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Poll not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"poll": poll,
	})
}

// VotePoll records one vote per voter per poll
func VotePoll(c *gin.Context) {

	pollID := c.Param("id")
	optionID := c.Param("optionId")

	// -----------------------------
	// Get voter ID
	// -----------------------------

	voterID := strings.TrimSpace(
		c.GetHeader("X-Voter-ID"),
	)

	if voterID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Voter ID is required",
		})
		return
	}

	// Basic voter ID length validation
	if len(voterID) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid voter ID",
		})
		return
	}

	// -----------------------------
	// Validate Poll ID
	// -----------------------------

	objectID, err := bson.ObjectIDFromHex(pollID)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	// -----------------------------
	// Validate Option ID
	// -----------------------------

	optionID = strings.TrimSpace(optionID)

	if optionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Option ID is required",
		})
		return
	}

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	// -----------------------------
	// Record vote
	// -----------------------------
	//
	// Vote will only be recorded when:
	//
	// 1. Poll exists
	// 2. Option exists
	// 3. Voter has NOT voted before
	//
	// $ne prevents the same voter from voting again.

	filter := bson.M{
		"_id": objectID,

		"options.id": optionID,

		"voters": bson.M{
			"$ne": voterID,
		},
	}

	update := bson.M{
		"$inc": bson.M{
			"options.$.votes": 1,
		},

		"$addToSet": bson.M{
			"voters": voterID,
		},
	}

	result, err := collection.UpdateOne(
		ctx,
		filter,
		update,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to vote",
		})
		return
	}

	// -----------------------------
	// No document matched
	// -----------------------------

	if result.MatchedCount == 0 {

		var poll models.Poll

		findErr := collection.FindOne(
			ctx,
			bson.M{
				"_id": objectID,
			},
		).Decode(&poll)

		// Poll doesn't exist
		if findErr != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Poll not found",
			})
			return
		}

		// Check if voter already voted
		for _, voter := range poll.Voters {

			if voter == voterID {

				c.JSON(http.StatusConflict, gin.H{
					"error": "You have already voted in this poll",
				})

				return
			}
		}

		// Poll exists but option doesn't
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Poll or option not found",
		})

		return
	}

	// -----------------------------
	// Get updated poll
	// -----------------------------

	var updatedPoll models.Poll

	err = collection.FindOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	).Decode(&updatedPoll)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch updated poll",
		})
		return
	}

	// -----------------------------
	// Publish real-time update
	// -----------------------------

	config.PublishPollUpdate(
		pollID,
		updatedPoll,
	)

	// -----------------------------
	// Success response
	// -----------------------------

	c.JSON(http.StatusOK, gin.H{
		"message": "Vote recorded successfully",
		"poll":    updatedPoll,
	})
}
