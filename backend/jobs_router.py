import uuid
import json

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from fastapi_sse import EventSourceResponse

from redis.redis_stream import publish_message, listen_stream

router = APIRouter(prefix="/api")


class JobCreateRequest(BaseModel):
    prompt: str
    audiences: list[str]


class JobCreateResponse(BaseModel):
    jobId: str


@router.post("/jobs", response_model=JobCreateResponse)
async def create_job(request: JobCreateRequest, background_tasks: BackgroundTasks):
    """
    Create a new job for generating a presentation.
    """
    job_id = str(uuid.uuid4())
    # Placeholder: kick off AI generation in background
    # background_tasks.add_task(run_ai_generation, job_id, request.prompt, request.audiences)
    return {"jobId": job_id}


@router.get("/events/{job_id}")
async def events(job_id: str):
    """
    Stream events from Redis for the given jobId via Server-Sent Events.
    """
    async def event_generator():
        async for msg in listen_stream(job_id):
            yield {"event": "message", "data": msg}

    return EventSourceResponse(event_generator())


class PushDummyRequest(BaseModel):
    jobId: str
    payload: dict


@router.post("/pushDummy")
async def push_dummy(request: PushDummyRequest):
    """
    TODO: Dummy endpoint to push test messages into the Redis stream.
    """
    await publish_message(request.jobId, json.dumps(request.payload))
    return {"status": "ok"} 