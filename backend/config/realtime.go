package config

import (
	"context"
	"encoding/json"
	"log"
)

type PollUpdate struct {
	PollID string      `json:"pollId"`
	Data   interface{} `json:"data"`
}

func PublishPollUpdate(pollID string, data interface{}) {
	update := PollUpdate{
		PollID: pollID,
		Data:   data,
	}

	message, err := json.Marshal(update)
	if err != nil {
		log.Println("Failed to encode poll update:", err)
		return
	}

	channel := "poll:" + pollID

	err = RedisClient.Publish(
		context.Background(),
		channel,
		message,
	).Err()

	if err != nil {
		log.Println("Failed to publish poll update:", err)
	}
}
