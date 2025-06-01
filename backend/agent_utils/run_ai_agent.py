from typing import Optional

import json
import logging
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types
from google.adk.agents import BaseAgent
from redis_utils.redis_stream import publish_message

logger = logging.getLogger(__name__)

async def run_ai_agent(
    agent: BaseAgent,
    subject_id: str,
    initial_state: dict,
    message_parts: list[str],
    app_name: str,
    output_key: Optional[str] = None
):
    """
    Generic wrapper to run a Google ADK agent and return the result.
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

    final_response_to_return = None
    async for event in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=initial_message):
        print('print1', event)
        await publish_message(job_id=subject_id, message=str(event))
        if event.is_final_response():
            if event.content and event.content.parts:
                final_response_to_return = event.content.parts[0].text
                logger.info(f"Final response captured: {final_response_to_return}")
            elif event.actions and event.actions.escalate:
                final_response_to_return = f"Agent escalated: {event.error_message or 'No specific message.'}"
                logger.error(f"Agent escalation captured: {final_response_to_return}")
            break # Exit the loop once the final response is found

    if final_response_to_return is not None:
        return final_response_to_return
    else:
        logger.error(f"Agent {agent.name} for job {subject_id} did not produce a final response after iterating events.")
        return None