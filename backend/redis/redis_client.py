import os
import redis.asyncio as redis

# Read Redis connection URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create a single async Redis client instance
global redis_client
redis_client = redis.from_url(REDIS_URL, decode_responses=True) 