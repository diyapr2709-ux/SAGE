import os
import json
import redis

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

def cache_json(key: str, value: dict):
    redis_client.set(key, json.dumps(value))

def read_json(key: str):
    data = redis_client.get(key)
    return json.loads(data) if data else None
