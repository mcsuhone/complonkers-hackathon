import json
import logging
from redis_utils.redis_stream import publish_message
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

async def run_ai_agent(
    agent,
    subject_id: str,
    initial_state: dict,
    message_parts: list[str],
    app_name: str,
):
    """
    Generic wrapper to run a Google ADK agent, then publish the agent.output_key result to Redis stream.
    """
    USER_ID = subject_id
    SESSION_ID = subject_id

    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name=app_name,
        user_id=USER_ID,
        session_id=SESSION_ID,
        state=initial_state
    )

    runner = Runner(agent=agent, app_name=app_name, session_service=session_service)

    initial_message = genai_types.Content(
        role='user',
        parts=[genai_types.Part(text=part) for part in message_parts]
    )

    # Run the agent to completion
    async for _ in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=initial_message):
        pass

    # Retrieve the result
    final_session = await session_service.get_session(
        app_name=app_name,
        user_id=USER_ID,
        session_id=SESSION_ID
    )
    if not final_session:
        logger.error(f"Final session not found for job {subject_id}")
        return None

    result = final_session.state.get(agent.output_key)
    try:
        payload = json.dumps(result)
    except (TypeError, ValueError):
        payload = str(result)

    await publish_message(subject_id, payload)
    return result