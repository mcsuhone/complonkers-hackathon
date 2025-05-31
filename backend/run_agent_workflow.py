import json
import logging
import re

import numpy as np

from agent_utils.run_ai_agent import run_ai_agent
from agents.data_analyst_agent import get_data_analyst_instructions
from agents.data_analyst_agent import get_analyst_agent
from agents.data_analyst_agent import get_sequential_agent
from redis_utils.redis_stream import publish_message
from agents.interpreter_agent import job_interpreter_agent
from agents.deck_architect_agent import deck_architect_agent
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
    

placeholder_slop = '''<!-- Financial Performance Slide with Chart -->
  <Slide id="financial-slide" classes="bg-gray-50 p-6">
    <Text mode="content" tag="h1" classes="text-4xl font-bold mb-8 text-center text-gray-800">
      <Content>Q4 Financial Performance</Content>
    </Text>
    
    <Container classes="grid grid-cols-2 gap-8">
      <Container classes="space-y-4">
        <Text mode="content" tag="h2" classes="text-2xl font-semibold text-gray-700">
          <Content>Key Metrics</Content>
        </Text>
        <List mode="content" ordered="false" classes="text-lg space-y-2">
          <Content>Revenue: $2.4M (+15% YoY)
Gross Margin: 68%
Operating Expenses: $1.1M
Net Income: $520K
Customer Acquisition Cost: $240</Content>
        </List>
      </Container>
      
      <Chart mode="content" type="bar" classes="w-full h-96">
        <Content>Quarterly revenue breakdown chart showing growth trend</Content>
        <ChartDefinition id="revenue-chart">
          <ChartConfig type="bar" title="Quarterly Revenue Growth" theme="corporate">
            <Dimensions width="500" height="400"/>
            <Margins top="20" right="30" bottom="40" left="50"/>
            <Axes>
              <XAxis field="quarter" title="Quarter"/>
              <YAxis field="revenue" title="Revenue ($M)" format="currency"/>
            </Axes>
            <Legend position="top-right" orientation="vertical"/>
          </ChartConfig>
          <Data>
            <DataSource type="inline" source="quarterly-revenue">
              <Field name="quarter" type="string"/>
              <Field name="revenue" type="number"/>
            </DataSource>
            <DataMapping field="quarter" role="dimension" dataType="string">
              <Mapping>Q1 2024</Mapping>
              <Mapping>Q2 2024</Mapping>
              <Mapping>Q3 2024</Mapping>
              <Mapping>Q4 2024</Mapping>
            </DataMapping>
            <DataMapping field="revenue" role="measure" dataType="decimal">
              <Mapping>1.8</Mapping>
              <Mapping>2.1</Mapping>
              <Mapping>2.2</Mapping>
              <Mapping>2.4</Mapping>
            </DataMapping>
          </Data>
          <Styling>
            <ColorScheme>["#3B82F6", "#60A5FA", "#93C5FD", "#DBEAFE"]</ColorScheme>
            <BarStyle cornerRadius="4" strokeWidth="1"/>
          </Styling>
          <Interactions>
            <Tooltip enabled="true" format="Revenue: ${value}M"/>
            <Hover highlight="true"/>
          </Interactions>
        </ChartDefinition>
      </Chart>
    </Container>
  </Slide>'''    


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
    print(f"Interpreter result: {interpreter_result}")
    parsed_interp = safe_parse_json(interpreter_result)
    await publish_message(subject_id, str(parsed_interp))
    print(f"Interpreter result: {parsed_interp}")

    # 2) Run simple deck architect agent
    architect_state = {
        "goal": parsed_interp.get("interpretation"),
        "context": json.dumps(parsed_interp.get("audience_strategies", {}))
    }
    architect_message = f"Generate presentation outline with the following state: {json.dumps(architect_state)}"
    architect_app = "simple_deck_architect_app"
    architect_result = await run_ai_agent(
        deck_architect_agent,
        subject_id=subject_id,
        initial_state=architect_state,
        message_parts=[architect_message],
        app_name=architect_app
    )
    if architect_result is None:
        logger.error(f"No result from agent {deck_architect_agent.name} for {subject_id}")
        return None

    # Publish architect output
    print(f"Architect result: {architect_result}")  # xml string
    
    logger.info(f"Architect result through logger")
    await publish_message(subject_id, str(architect_result))
    
    # 3) Slide idea iteration
    try:
        # Log raw architect_result for debugging parsing errors
        logger.info(f"Raw architect_result for {subject_id}: {architect_result}")
        # Remove all markdown fences including ```xml or ```
        architect_result = re.sub(r'```(?:xml)?', '', architect_result).strip()
        print(f"Raw architect_result for {subject_id}: {architect_result}")
        # Use a recoverable parser to handle minor malformations
        parser = etree.XMLParser(remove_blank_text=True, recover=True)
        # Sanitize XML: escape unescaped ampersands to prevent XML parsing errors
        sanitized_result = re.sub(r'&(?!amp;|lt;|gt;|apos;|quot;|#\d+;)', '&amp;', architect_result)
        logger.info(f"Sanitized architect_result for {subject_id}: {sanitized_result}")
        print(f"Sanitized architect_result for {subject_id}: {sanitized_result}")
        # Try parsing, wrap in a root tag on failure to ensure well-formedness
        try:
            ideas_root = etree.fromstring(sanitized_result.encode('utf-8'), parser)
        except etree.XMLSyntaxError:
            wrapped = f"<root>{sanitized_result}</root>"
            logger.warning(f"Wrapping XML content in <root> for recovery for {subject_id}")
            ideas_root = etree.fromstring(wrapped.encode('utf-8'), parser)
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
            
            else:
                analyst_agent = get_sequential_agent()
                slide_result = await run_ai_agent(
                    analyst_agent,  # Reusing interpreter agent for simplicity
                    subject_id=subject_id,
                    initial_state={"slide_xml": analyst_message},
                    message_parts=[analyst_message],
                    app_name=slide_app,
                    output_key="script_output")
            if slide_result is None:
                logger.error(f"No result from agent {analyst_agent.name} for slide idea in {subject_id}")
                continue
            logger.info(f"Slide result: {slide_result}")
            # Publish each slide result
            await publish_message(subject_id, slide_result)
    except Exception as e:
        logger.error(f"Error during slide idea iteration for {subject_id}: {e}")
        # Log the failing XML string for further inspection
        logger.error(f"Architect result XML that failed parsing: {architect_result}")
        # Log full exception stack trace
        logger.exception("Exception stack trace for slide idea iteration")


    return architect_result
