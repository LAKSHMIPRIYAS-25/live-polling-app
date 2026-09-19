package controllers

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"live-polling-backend/config"
	"live-polling-backend/models"
)

// ========================================
// SAFE REDIS PUBLISH
// ========================================

// safePublishPollUpdate prevents Redis publish
// problems from breaking the HTTP response.
func safePublishPollUpdate(
	pollID string,
	data interface{},
) {
	defer func() {
		if r := recover(); r != nil {
			log.Println(
				"Redis publish panic:",
				r,
			)
		}
	}()

	config.PublishPollUpdate(
		pollID,
		data,
	)
}

// ========================================
// CREATE POLL
// ========================================

// CreatePoll creates a new poll.
func CreatePoll(c *gin.Context) {
	var poll models.Poll

	if err := c.ShouldBindJSON(&poll); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
		})
		return
	}

	// Clean question.
	poll.Question = strings.TrimSpace(
		poll.Question,
	)

	if poll.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Poll question is required",
		})
		return
	}

	if len(poll.Question) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Poll question must be at least 3 characters",
		})
		return
	}

	if len(poll.Question) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Poll question must not exceed 200 characters",
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

	// ========================================
	// CLEAN OPTIONS
	// ========================================

	cleanOptions := make(
		[]models.PollOption,
		0,
		len(poll.Options),
	)

	seen := make(
		map[string]bool,
	)

	for _, option := range poll.Options {
		option.Text = strings.TrimSpace(
			option.Text,
		)

		if option.Text == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "All options are required",
			})
			return
		}

		if len(option.Text) > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Option text must not exceed 100 characters",
			})
			return
		}

		key := strings.ToLower(
			option.Text,
		)

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

	// ========================================
	// CREATE POLL OBJECT
	// ========================================

	poll.ID = bson.NewObjectID()

	poll.Options = cleanOptions

	poll.Voters = []string{}

	poll.CreatedAt = time.Now().
		UTC().
		Format(time.RFC3339)

	collection := config.DB.Collection(
		"polls",
	)

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
		log.Println(
			"Create poll error:",
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create poll",
		})
		return
	}

	// ========================================
	// RESPONSE
	// ========================================

	c.JSON(http.StatusCreated, gin.H{
		"message": "Poll created successfully",
		"poll":    poll,
	})
}

// ========================================
// GET ALL POLLS
// ========================================

// GetPolls returns all polls.
func GetPolls(c *gin.Context) {
	collection := config.DB.Collection(
		"polls",
	)

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
		log.Println(
			"Get polls error:",
			err,
		)

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
		log.Println(
			"Decode polls error:",
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode polls",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"polls": polls,
	})
}

// ========================================
// GET ONE POLL
// ========================================

// GetPoll returns one poll by ID.
func GetPoll(c *gin.Context) {
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

	collection := config.DB.Collection(
		"polls",
	)

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
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Poll not found",
			})
			return
		}

		log.Println(
			"Get poll error:",
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch poll",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"poll": poll,
	})
}

// ========================================
// VOTE POLL
// ========================================

// VotePoll records one vote for a poll option.
func VotePoll(c *gin.Context) {
	pollID := c.Param("id")

	optionID := c.Param("optionId")

	// ========================================
	// VOTER ID
	// ========================================

	voterID := strings.TrimSpace(
		c.GetHeader("X-Voter-ID"),
	)

	if voterID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Voter ID is required",
		})
		return
	}

	// ========================================
	// POLL ID
	// ========================================

	objectID, err := bson.ObjectIDFromHex(
		pollID,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	collection := config.DB.Collection(
		"polls",
	)

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	// ========================================
	// GET POLL
	// ========================================

	var poll models.Poll

	err = collection.FindOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	).Decode(&poll)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Poll not found",
			})
			return
		}

		log.Println(
			"Find poll for vote error:",
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch poll",
		})
		return
	}

	// ========================================
	// CHECK OPTION
	// ========================================

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

	// ========================================
	// CHECK DUPLICATE VOTE
	// ========================================

	for _, existingVoter := range poll.Voters {
		if existingVoter == voterID {
			c.JSON(http.StatusConflict, gin.H{
				"error": "You have already voted in this poll",
			})
			return
		}
	}

	// ========================================
	// ATOMIC UPDATE
	// ========================================

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
		log.Println(
			"Vote update error:",
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to record vote",
		})
		return
	}

	if result.MatchedCount == 0 {
		// Check current poll again.
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

	// ========================================
	// GET UPDATED POLL
	// ========================================

	var updatedPoll models.Poll

	err = collection.FindOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	).Decode(&updatedPoll)

	if err != nil {
		log.Println(
			"Fetch updated poll error:",
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Vote recorded but failed to fetch updated poll",
		})
		return
	}

	// ========================================
	// REDIS REAL-TIME UPDATE
	// ========================================

	safePublishPollUpdate(
		pollID,
		updatedPoll,
	)

	// ========================================
	// RESPONSE
	// ========================================

	c.JSON(http.StatusOK, gin.H{
		"message": "Vote recorded successfully",
		"poll":    updatedPoll,
	})
}

// ========================================
// DELETE POLL
// ========================================

// DeletePoll deletes a poll.
func DeletePoll(c *gin.Context) {
	id := c.Param("id")

	// ========================================
	// VALIDATE ID
	// ========================================

	objectID, err := bson.ObjectIDFromHex(
		id,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	// ========================================
	// MONGODB COLLECTION
	// ========================================

	collection := config.DB.Collection(
		"polls",
	)

	// ========================================
	// CONTEXT
	// ========================================

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	// ========================================
	// CHECK POLL EXISTS
	// ========================================

	var poll models.Poll

	err = collection.FindOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	).Decode(&poll)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Poll not found",
			})
			return
		}

		log.Println(
			"Find poll before delete error:",
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to find poll",
		})
		return
	}

	// ========================================
	// DELETE FROM MONGODB
	// ========================================

	result, err := collection.DeleteOne(
		ctx,
		bson.M{
			"_id": objectID,
		},
	)

	if err != nil {
		log.Println(
			"Delete poll error:",
			err,
		)

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

	// ========================================
	// REDIS DELETE EVENT
	// ========================================
	//
	// IMPORTANT:
	// MongoDB deletion has already succeeded.
	//
	// If Redis fails, we DON'T return 500.
	//
	// This prevents:
	//
	// "Failed to delete poll (500)"
	//
	// after the poll has actually been deleted.
	//

	safePublishPollUpdate(
		id,
		map[string]interface{}{
			"type":   "deleted",
			"pollId": id,
		},
	)

	// ========================================
	// SUCCESS RESPONSE
	// ========================================

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Poll deleted successfully",
		"pollId":  id,
	})
}
