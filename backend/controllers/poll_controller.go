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

// CreatePoll creates a new poll.
func CreatePoll(c *gin.Context) {
	var poll models.Poll

	if err := c.ShouldBindJSON(&poll); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
		})
		return
	}

	poll.Question = strings.TrimSpace(poll.Question)

	if poll.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Poll question is required",
		})
		return
	}

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

	// Clean and validate options.
	cleanOptions := make([]models.PollOption, 0)

	seen := make(map[string]bool)

	for _, option := range poll.Options {
		option.Text = strings.TrimSpace(option.Text)

		if option.Text == "" {
			continue
		}

		key := strings.ToLower(option.Text)

		if seen[key] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Duplicate options are not allowed",
			})
			return
		}

		seen[key] = true

		option.ID = bson.NewObjectID().Hex()
		option.Votes = 0

		cleanOptions = append(
			cleanOptions,
			option,
		)
	}

	if len(cleanOptions) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least 2 valid options are required",
		})
		return
	}

	poll.ID = bson.NewObjectID()
	poll.Options = cleanOptions
	poll.Voters = []string{}
	poll.CreatedAt = time.Now().Format(time.RFC3339)

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	_, err := collection.InsertOne(
		ctx,
		poll,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create poll",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Poll created successfully",
		"poll":    poll,
	})
}

// GetPolls returns all polls.
func GetPolls(c *gin.Context) {
	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

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

	polls := make(
		[]models.Poll,
		0,
	)

	if err := cursor.All(
		ctx,
		&polls,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode polls",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"polls": polls,
	})
}

// GetPoll returns one poll by ID.
func GetPoll(c *gin.Context) {
	id := c.Param("id")

	objectID, err := bson.ObjectIDFromHex(id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	var poll models.Poll

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

// VotePoll records one vote for a poll option.
func VotePoll(c *gin.Context) {
	pollID := c.Param("id")
	optionID := c.Param("optionId")

	// Read voter ID sent by frontend.
	voterID := strings.TrimSpace(
		c.GetHeader("X-Voter-ID"),
	)

	if voterID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Voter ID is required",
		})
		return
	}

	objectID, err := bson.ObjectIDFromHex(
		pollID,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	// Get the poll first.
	var poll models.Poll

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

	// Check whether this option exists.
	optionExists := false

	for _, option := range poll.Options {
		if option.ID == optionID {
			optionExists = true
			break
		}
	}

	if !optionExists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Option not found",
		})
		return
	}

	// Check whether this voter has already voted.
	for _, existingVoter := range poll.Voters {
		if existingVoter == voterID {
			c.JSON(http.StatusConflict, gin.H{
				"error": "You have already voted in this poll",
			})
			return
		}
	}

	// Atomically:
	// 1. Check voter is not already present.
	// 2. Add voter ID.
	// 3. Increase selected option vote count.
	filter := bson.M{
		"_id": objectID,
		"voters": bson.M{
			"$ne": voterID,
		},
		"options": bson.M{
			"$elemMatch": bson.M{
				"id": optionID,
			},
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
			"error": "Failed to record vote",
		})
		return
	}

	if result.MatchedCount == 0 {
		// Re-check if the voter already voted.
		var currentPoll models.Poll

		err := collection.FindOne(
			ctx,
			bson.M{
				"_id": objectID,
			},
		).Decode(&currentPoll)

		if err == nil {
			for _, existingVoter := range currentPoll.Voters {
				if existingVoter == voterID {
					c.JSON(http.StatusConflict, gin.H{
						"error": "You have already voted in this poll",
					})
					return
				}
			}
		}

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Poll or option not found",
		})
		return
	}

	// Fetch the updated poll.
	var updatedPoll models.Poll

	err = collection.FindOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	).Decode(&updatedPoll)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Vote recorded but failed to fetch updated poll",
		})
		return
	}

	// Publish real-time update through Redis.
	config.PublishPollUpdate(
		pollID,
		updatedPoll,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Vote recorded successfully",
		"poll":    updatedPoll,
	})
}

// DeletePoll deletes a poll.
func DeletePoll(c *gin.Context) {
	id := c.Param("id")

	objectID, err := bson.ObjectIDFromHex(
		id,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	collection := config.DB.Collection("polls")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	// Get poll before deleting so we can
	// publish the deleted event.
	var poll models.Poll

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

	// Delete the poll.
	result, err := collection.DeleteOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete poll",
		})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Poll not found",
		})
		return
	}

	// Publish delete event through Redis.
	config.PublishPollUpdate(
		id,
		map[string]interface{}{
			"type":   "deleted",
			"pollId": id,
		},
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Poll deleted successfully",
		"pollId":  id,
	})
}