import logging
import json
from typing import Dict, Any

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool, ToolContext

from services.database_service import DatabaseService

import os
from lxml import etree
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash-preview-05-20" # Or your preferred model

async def get_database_schema(tool_context: ToolContext) -> Dict[str, Any]:
    """
    A tool that connects to a database using the db_config from tool_context,
    fetches raw table schemas, and returns them as a dictionary.
    Input: None (uses db_config from tool_context)
    Output: dict: Contains 'schemas' (dict) or 'error' (str).
    """
    db_config_dict = tool_context.state.get("db_config")
    
    if not isinstance(db_config_dict, dict) or not db_config_dict.get("dbname"):
        return {"error": "Invalid or missing db_config in context"}

    if db_config_dict.get("dbname") in ["your_db_name", "test_db_placeholder"]:
        return {"schemas": {}, "message": "Placeholder DB, no schema fetched"}

    service = DatabaseService(db_config_dict)
    async with service as db:
        table_schemas = await db.get_table_schemas()
        return {"schemas": table_schemas}


db_schema_tool = FunctionTool(
    func=get_database_schema
)


SIMPLE_DECK_ARCHITECT_AGENT_PROMPT = """
You are an AI assistant that generates business presentation slide outlines.

Your primary inputs are:
1.  `goal`: The overall objective of the presentation.
2.  `context`: The audience and setting for the presentation.
3.  `db_config` (optional): A dictionary containing database connection details (`dbname`, `user`, `password`, `host`, `port`).

Your process is as follows:

1.  **Analyze Database Schema (if `db_config` is provided and not a placeholder):**
    *   If `db_config` is present and `dbname` is not 'your_db_name' or 'test_db_placeholder':
        *   Use the `get_database_schema_tool` tool. Provide this tool with the `db_config` dictionary exactly as you received it.
        *   The tool will return a dictionary which will either contain a `schemas` key with the database schemas or an `error` key if something went wrong.
    *   If the tool returns an error, or if `db_config` is a placeholder, proceed without specific database insights.
    *   If you receive schemas:
        *   **Internally summarize these raw schemas in natural language for your own understanding.** Do NOT output this internal summary. This summary should describe the likely purpose of each table and its key columns based on their names and structure.

2.  **Generate Slide Outline as XML:**
    *   Based on the `goal`, `context`, and your internal understanding of the database schema (if available and summarized), create an XML document.
    *   The XML document must conform to the `schemas/slide_ideas.xsd` schema provided below.

<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://www.complonkers-hackathon/slide_ideas"
           xmlns="http://www.complonkers-hackathon/slide_ideas"
           elementFormDefault="qualified">

  <!-- Root element for slide ideas -->
  <xs:element name="SlideIdeas" type="SlideIdeasType"/>

  <!-- Container for multiple slide ideas -->
  <xs:complexType name="SlideIdeasType">
    <xs:sequence>
      <xs:element name="SlideIdea" type="SlideIdeaType" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Definition of a single slide idea -->
  <xs:complexType name="SlideIdeaType">
    <xs:sequence>
      <xs:element name="Title" type="xs:string"/>
      <xs:element name="ContentDescription" type="xs:string"/>
      <xs:element name="DataInsights" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

</xs:schema>

IMPORTANT: Output ONLY the raw XML string. Do not wrap it in code blocks, JSON, or any other text."""

simple_deck_architect_agent = LlmAgent(
    name="SimpleDeckArchitectAgent",
    model=MODEL_NAME,
    instruction=SIMPLE_DECK_ARCHITECT_AGENT_PROMPT,
    tools=[db_schema_tool], 
    output_key="simple_deck_slides_xml"
)

async def run_architect_agent(initial_state: dict):
    from google.adk.sessions import InMemorySessionService
    from google.adk.runners import Runner
    from google.genai import types as genai_types

    APP_NAME = "simple_deck_architect_app"
    USER_ID = "test_user_simple"
    SESSION_ID = "test_session_simple_001"

    db_connection_config_real = {
        "dbname": "chinook", # Assuming you have a chinook DB for testing
        "user": "postgres", # Replace with your actual DB credentials
        "password": "postgres", # Replace with your actual DB credentials
        "host": "localhost",
        "port": 5432 
    }
    

    initial_state["db_config"] = db_connection_config_real

    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID, state=initial_state
    )
    logger.info(f"Initial session state for SimpleDeckArchitect: {session.state}")

    runner = Runner(agent=simple_deck_architect_agent, app_name=APP_NAME, session_service=session_service)
    # Create a message that includes the state information
    initial_message_text = json.dumps({
        "goal": initial_state["goal"],
        "context": initial_state["context"],
        "db_config": initial_state["db_config"]
    })
    dummy_initial_message = genai_types.Content(
        role='user',
        parts=[genai_types.Part(text=f"Generate presentation outline with the following state: {initial_message_text}")]
    )
    
    logger.info("\n--- Running SimpleDeckArchitectAgent Workflow ---")
    events_generator = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=dummy_initial_message)

    async for event in events_generator:
        event_text = event.content.parts[0].text if event.content and event.content.parts else "No text content"
        actions_text = str(event.actions) if event.actions else "No actions"
        logger.info(f"EVENT Author: {event.author}, Content: '{event_text}', Actions: {actions_text}")

    final_session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    print("\n--- SimpleDeckArchitectAgent Interaction Result ---")
    if final_session:
        print("Final Session State:")
        print(json.dumps(final_session.state, indent=2, default=str))
        
        generated_slides_xml = final_session.state.get(simple_deck_architect_agent.output_key)
        if generated_slides_xml:
            print("\nGenerated Presentation Outline (XML string from LlmAgent output_key):")
            print(generated_slides_xml)
            # Validate against XSD
            schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "schemas", "slide_ideas.xsd"))
            schema_doc = etree.parse(schema_path)
            schema = etree.XMLSchema(schema_doc)
            try:
                xml_doc = etree.fromstring(generated_slides_xml.encode())
            except Exception as e:
                print(f"Failed to parse XML: {e}")
                return None
            # Add unique slideId to each SlideIdea element
            namespace = {"ns": "http://www.complonkers-hackathon/slide_ideas"}
            for slide_idea in xml_doc.findall("ns:SlideIdea", namespaces=namespace):
                slide_id_elem = etree.Element("SlideId")
                slide_id_elem.text = str(uuid.uuid4())
                slide_idea.insert(0, slide_id_elem)
            # Serialize modified XML with slideIds back to string
            modified_xml = etree.tostring(xml_doc, encoding="unicode")
            if not schema.validate(xml_doc):
                print("XML failed schema validation:")
                for error in schema.error_log:
                    print(error)
                return None
            else:
                print("XML validated against schema.")
                return modified_xml
        else:
            print(f"\nNo output found in session state for key '{simple_deck_architect_agent.output_key}'.")
            return None
    else:
        print("No final session found.")
        return None

if __name__ == "__main__":
    import asyncio
    try:
        initial_state = {
            "goal": "Boost Q4 Sales for New Eco-Product Line",
            "context": "Presenting to the executive board and marketing VPs.",
        }
        asyncio.run(run_architect_agent(initial_state))
    except Exception as e:
        logger.error(f"Error running main_test_simple: {e}", exc_info=True) 