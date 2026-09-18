package config

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var DB *mongo.Database

func ConnectDB() {

	uri := os.Getenv("MONGODB_URI")

	if uri == "" {
		panic("MONGODB_URI is not set")
	}

	clientOptions := options.Client().
		ApplyURI(uri).
		SetConnectTimeout(30 * time.Second).
		SetServerSelectionTimeout(30 * time.Second)

	ctx, cancel := context.WithTimeout(
		context.Background(),
		30*time.Second,
	)
	defer cancel()

	client, err := mongo.Connect(clientOptions)

	if err != nil {
		panic(err)
	}

	err = client.Ping(ctx, nil)

	if err != nil {
		panic(err)
	}

	DB = client.Database("live_polling")

	fmt.Println("MongoDB Atlas connected successfully!")
}