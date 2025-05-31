import uuid
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from redis_utils.redis_stream import publish_message, listen_stream

logger = logging.getLogger(__name__)

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
    logger.info(f"POST /api/jobs called with prompt={request.prompt}, audiences={request.audiences}")
    job_id = str(uuid.uuid4())
    # Placeholder: kick off AI generation in background
    # background_tasks.add_task(run_ai_generation, job_id, request.prompt, request.audiences)
    return {"jobId": job_id}


@router.get("/events/{job_id}")
async def events(request: Request, job_id: str):
    """
    Stream events from Redis for the given jobId via Server-Sent Events.
    """
    logger.info(f"GET /api/events/{job_id} - client subscribed to events")
    async def event_generator():
        async for msg in listen_stream(job_id):
            if await request.is_disconnected():
                logger.info(f"Client disconnected from /api/events/{job_id}")
                break
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
    logger.info(f"POST /api/pushDummy called with jobId={request.jobId}, payload={request.payload}")
    await publish_message(request.jobId, json.dumps(request.payload))
    return {"status": "ok"} 