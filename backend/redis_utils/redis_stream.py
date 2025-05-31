from typing import AsyncGenerator

from .redis_client import redis_client


async def publish_message(job_id: str, message: str) -> None:
    """
    Publish a message to the Redis stream for the given job.
    """
    stream_key = f"events:{job_id}"
    # XADD to stream with automatic ID
    print(f"Publishing message to {stream_key}: {message}")
    await redis_client.xadd(stream_key, {"message": message})


async def listen_stream(job_id: str) -> AsyncGenerator[str, None]:
    """
    Listen to a Redis stream for the given job and yield messages as they arrive.
    """
    stream_key = f"events:{job_id}"
    last_id = "0-0"

    while True:
        # Block indefinitely until a new entry arrives
        results = await redis_client.xread({stream_key: last_id}, block=0, count=1)
        if not results:
            continue

        for _key, messages in results:
            for message_id, message in messages:
                # Update last_id to the ID of the message just processed
                last_id = message_id
                # Extract the 'message' field
                raw = message.get("message")
                yield raw 