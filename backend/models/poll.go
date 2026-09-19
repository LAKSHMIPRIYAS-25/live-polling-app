package models

import "go.mongodb.org/mongo-driver/v2/bson"

type PollOption struct {
	ID    string `json:"id" bson:"id"`
	Text  string `json:"text" bson:"text"`
	Votes int    `json:"votes" bson:"votes"`
}

type Poll struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Question  string       `json:"question" bson:"question"`
	Options   []PollOption `json:"options" bson:"options"`
	CreatedAt string       `json:"createdAt" bson:"createdAt"`
	Voters    []string     `json:"-" bson:"voters,omitempty"`
}