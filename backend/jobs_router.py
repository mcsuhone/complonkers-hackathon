import uuid
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from redis_utils.redis_stream import publish_message, listen_stream
from run_agent_workflow import run_agent_workflow

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
    print(f"request={request}")
    job_id = str(uuid.uuid4())
    # Kick off multi-agent workflow in background using only request data
    background_tasks.add_task(
        run_agent_workflow,
        job_id,
        request.prompt,
        request.audiences
    )
    return {"jobId": job_id}


@router.get("/events/{job_id}")
async def events(request: Request, job_id: str):
    """
    Stream events from Redis for the given jobId via Server-Sent Events.
    """
    logger.info(f"Subscriber connected for job {job_id}")

    async def event_generator():
        print(f"Start SSE generator for job {job_id}")
        # Send initial event to establish SSE connection
        yield f"data: connected to job {job_id}\n\n"
        async for msg in listen_stream(job_id):
            if await request.is_disconnected():
                logger.info(f"Client disconnected from /api/events/{job_id}")
                break
            # Format as Server-Sent Events data frame
            yield f"data: {msg}\n\n"

    # Stream back as text/event-stream
    return StreamingResponse(event_generator(), media_type="text/event-stream")


class PushDummyRequest(BaseModel):
    jobId: str
    payload: dict


@router.post("/pushDummy")
async def push_dummy(body: PushDummyRequest):
    """
    Dummy endpoint to push test messages into the Redis queue for the given job.
    """
    logger.info(f"POST /api/pushDummy called with jobId={body.jobId}, payload={body.payload}")
    try:
        await publish_message(body.jobId, json.dumps(body.payload))
        logger.info(f"Published dummy message to queue events:{body.jobId}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Failed to publish dummy message for job {body.jobId}: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish dummy message") 