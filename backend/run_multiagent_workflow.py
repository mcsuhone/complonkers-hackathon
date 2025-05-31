import json
import logging
import re
from agent_utils.run_ai_agent import run_ai_agent
from redis_utils.redis_stream import publish_message
from app.agents.interpreter.agent import job_interpreter_agent
from app.agents.architect.simple_deck_architect_agent import simple_deck_architect_agent
from json import JSONDecodeError

logger = logging.getLogger(__name__)

def safe_json_dumps(obj):
    try:
        return json.dumps(obj)
    except (TypeError, ValueError):
        return str(obj)

def safe_parse_json(raw):
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return {"raw": raw}
    s = raw.strip()
    # remove code fences
    s = re.sub(r"```(?:json)?\s*", "", s)
    s = re.sub(r"```", "", s)
    try:
        d = json.loads(s)
    except JSONDecodeError:
        start = s.find("{")
        end = s.rfind("}")
        if start != -1 and end != -1:
            try:
                d = json.loads(s[start:end+1])
            except:
                return {"raw": s}
        else:
            return {"raw": s}
    # unwrap job_plan
    if isinstance(d, dict) and "job_plan" in d and isinstance(d["job_plan"], dict):
        return d["job_plan"]
    return d

async def run_multiagent_workflow(
    subject_id: str,
    prompt: str,
    audiences: list[str],
):
    """
    Main workflow to run one or more AI agents in sequence, using only the initial request inputs.
    """
    # 1) Run interpreter agent
    interpreter_state = {"prompt": prompt, "audiences": audiences}
    interpreter_message_parts = [
        "Interpret the job request",
        f"Prompt: {prompt}",
        f"Audiences: {audiences}"
    ]
    interpreter_app = "job_interpreter_app"
    interpreter_result = await run_ai_agent(
        job_interpreter_agent,
        subject_id=subject_id,
        initial_state=interpreter_state,
        message_parts=interpreter_message_parts,
        app_name=interpreter_app,
    )
    if interpreter_result is None:
        logger.error(f"No result from agent {job_interpreter_agent.name} for {subject_id}")
        return None

    # Parse and publish interpreter output
    parsed_interp = safe_parse_json(interpreter_result)
    await publish_message(subject_id, json.dumps(parsed_interp))
    print(f"Interpreter result: {parsed_interp}")

    # 2) Run simple deck architect agent
    architect_state = {
        "goal": parsed_interp.get("interpretation"),
        "context": json.dumps(parsed_interp.get("audience_strategies", {}))
    }
    architect_message = f"Generate presentation outline with the following state: {json.dumps(architect_state)}"
    architect_app = "simple_deck_architect_app"
    architect_result = await run_ai_agent(
        simple_deck_architect_agent,
        subject_id=subject_id,
        initial_state=architect_state,
        message_parts=[architect_message],
        app_name=architect_app
    )
    if architect_result is None:
        logger.error(f"No result from agent {simple_deck_architect_agent.name} for {subject_id}")
        return None

    # Publish architect output
    try:
        arch_payload = json.dumps(architect_result)
    except (TypeError, ValueError):
        arch_payload = str(architect_result)
    await publish_message(subject_id, arch_payload)

    return architect_result
