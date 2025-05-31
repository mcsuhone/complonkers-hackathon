import uuid
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from redis_utils.redis_stream import publish_message, listen_stream
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


class JobCreateRequest(BaseModel):
    prompt: str
    audiences: list[str]


class JobCreateResponse(BaseModel):
    jobId: str


# Define a simple agent to interpret the job request
job_interpreter_agent = LlmAgent(
    name="JobInterpreterAgent",
    model="gemini-2.0-flash-001",
    instruction="""You are a job interpreter. You will receive a 'prompt' (user's request) and 'audiences' (list of target audiences) in session state.
Your task is to:
1. Provide a concise summary of what the user wants to achieve.
2. Create a JSON object 'job_plan' with two fields:
   - 'interpretation': your summary of the user's intent.
   - 'audience_strategies': a mapping from each audience to a brief description of how to tailor the presentation for that audience.
Return only the JSON object.""",
    output_key="job_plan",
)

# Background task to run the agent and publish results to Redis
async def run_ai_generation(job_id: str, prompt: str, audiences: list[str]):
    session_service = InMemorySessionService()
    APP_NAME = "job_interpreter_app"
    USER_ID = job_id
    SESSION_ID = job_id
    logger.info(f"Running agent for job {job_id} with prompt={prompt} and audiences={audiences}")
    initial_state = {"prompt": prompt, "audiences": audiences}
    session = await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID, state=initial_state
    )
    runner = Runner(agent=job_interpreter_agent, app_name=APP_NAME, session_service=session_service)
    # Kick off the agent with an initial message
    initial_message = genai_types.Content(
        role='user',
        parts=[
            genai_types.Part(text="Interpret the job request"), genai_types.Part(text=f"Prompt: {prompt}"),
            genai_types.Part(text=f"Audiences: {audiences}")
        ]
    )
    async for event in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=initial_message):
        pass  # process events if needed
    # Retrieve the result
    final_session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    job_plan = final_session.state.get("job_plan", {})
    # Publish the agent's output to the Redis stream
    await publish_message(job_id, json.dumps(job_plan))


@router.post("/jobs", response_model=JobCreateResponse)
async def create_job(request: JobCreateRequest, background_tasks: BackgroundTasks):
    """
    Create a new job for generating a presentation.
    """
    print(f"request={request}")
    job_id = str(uuid.uuid4())
    # Kick off AI generation in background
    background_tasks.add_task(run_ai_generation, job_id, request.prompt, request.audiences)
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