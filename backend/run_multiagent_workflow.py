import json
import logging
from agent_utils.run_ai_agent import run_ai_agent
from redis_utils.redis_stream import publish_message
from app.agents.interpreter.agent import job_interpreter_agent

logger = logging.getLogger(__name__)

async def run_multiagent_workflow(
    subject_id: str,
    prompt: str,
    audiences: list[str],
):
    """
    Main workflow to run one or more AI agents in sequence, using only the initial request inputs.
    """
    # Build state and messages from request
    initial_state = {"prompt": prompt, "audiences": audiences}
    message_parts = [
        "Interpret the job request",
        f"Prompt: {prompt}",
        f"Audiences: {audiences}"
    ]
    app_name = "job_interpreter_app"
    # Run the job interpreter agent
    result = await run_ai_agent(
        job_interpreter_agent,
        subject_id=subject_id,
        initial_state=initial_state,
        message_parts=message_parts,
        app_name=app_name,
    )
    if result is None:
        logger.error(f"No result from agent {job_interpreter_agent.name} for {subject_id}")
        return None

    try:
        payload = json.dumps(result)
    except (TypeError, ValueError):
        payload = str(result)

    await publish_message(subject_id, payload)
    return result
