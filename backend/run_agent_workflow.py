import json
import logging
import re
from agent_utils.run_ai_agent import run_ai_agent
from backend.agents.data_analyst_agent import analyst_agent
from redis_utils.redis_stream import publish_message
from agents.interpreter_agent import job_interpreter_agent
from agents.simple_deck_architect_agent import simple_deck_architect_agent
from json import JSONDecodeError
from lxml import etree

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def safe_json_dumps(obj):
    try:
        return json.dumps(obj)
    except Exception as e:
        print('Error serializing object to JSON:', obj)
        return str(obj)

def safe_parse_json(raw) -> dict:
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

async def run_agent_workflow(
    subject_id: str,
    prompt: str,
    audiences: list[str],
):
    try:
        return await _run_agent_workflow(subject_id, prompt, audiences)
    except Exception as e:
        logger.error(f"Error running agent workflow for {subject_id}: {e}")
        print(f"Error running agent workflow for {subject_id}: {e}")
        return None

async def _run_agent_workflow(
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
    await publish_message(subject_id, interpreter_result)
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
    print(f"Architect result: {architect_result}")  # xml string
    print('type', type(architect_result))
    
    logger.info(f"Architect result through logger")
    await publish_message(subject_id, architect_result)
    
    # 3) Slide idea iteration
    try:
        parser = etree.XMLParser(remove_blank_text=True)
        ideas_root = etree.fromstring(architect_result.encode('utf-8'), parser)
        ns_ideas = "http://www.complonkers-hackathon/slide_ideas"
        logger.info(f"Parsed Slide Ideas XML for {subject_id}: {etree.tostring(ideas_root, encoding='unicode', pretty_print=True)}")
        print(f"Parsed Slide Ideas XML for {subject_id}: {etree.tostring(ideas_root, encoding='unicode', pretty_print=True)}")
        for slide_idea in ideas_root:  # todo replace with xpath or findall
            # Transform slide idea into final Slide XML using naive analyst
            print('Processing slide idea:', etree.tostring(slide_idea, encoding='unicode', pretty_print=True))
            #slide_elem = analyze_slide_idea(slide_idea)
            # Serialize Slide element to string
            #slide_xml = etree.tostring(slide_elem, encoding='unicode', pretty_print=True)
            
            analyst_message = etree.tostring(slide_idea, encoding='unicode', pretty_print=True)
            slide_app = "ai_slop"
            slide_result = await run_ai_agent(
                analyst_agent,  # Reusing interpreter agent for simplicity
                subject_id=subject_id,
                initial_state={"slide_xml": analyst_message},
                message_parts=[analyst_message],
                app_name=slide_app
            )
            if slide_result is None:
                logger.error(f"No result from agent {analyst_agent.name} for slide idea in {subject_id}")
                continue
            logger.info(f"Slide result: {slide_result}")
            # Publish each slide result
            await publish_message(subject_id, slide_result)
    except Exception as e:
        logger.error(f"Error during slide idea iteration: {e}")

    return architect_result
