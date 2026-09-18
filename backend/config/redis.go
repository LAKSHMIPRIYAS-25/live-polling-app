package config

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func ConnectRedis() {

	redisAddr := os.Getenv("REDIS_ADDR")

	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	_, err := RedisClient.Ping(context.Background()).Result()

	if err != nil {
		log.Fatal("Redis connection failed:", err)
	}

	log.Println("Redis connected successfully!")
}