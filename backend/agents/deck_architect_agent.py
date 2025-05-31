from __future__ import annotations

# Standard library imports
import logging
import json
import os
import uuid
from typing import Dict, Any, Optional, AsyncGenerator

# Third-party imports
from lxml import etree
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool, ToolContext
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types

# Local imports
from .services.database_service import DatabaseService
from .lib import load_xml_output_schema

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants and Configuration
class Config:
    # Agent Configuration
    MODEL_NAME = "gemini-2.5-flash-preview-05-20"
    APP_NAME = "test_deck_architect_app"
    USER_ID = "test_user_simple"
    SESSION_ID = "test_session_simple_001"
    
    DB_CONFIG = {
        "dbname": "chinook",  # Assuming you have a chinook DB for testing
        "user": "postgres",    # Replace with your actual DB credentials
        "password": "postgres",  # Replace with your actual DB credentials
        "host": "localhost",
        "port": 5432
    }
    
    # XML Configuration
    XML_NAMESPACE = {
        "ns": "http://www.complonkers-hackathon/slide_ideas"
    }
    SCHEMA_RELATIVE_PATH = os.path.join("..", "..", "schemas", "slide_ideas.xsd")
    
    # Database Placeholders
    PLACEHOLDER_DBS = ["your_db_name", "test_db_placeholder"]



schema = os.path.join("..", "..", "agents", "chinook.sql")
with open(schema, 'r') as file:
    schemas = file.read()

# Agent Prompts
DECK_ARCHITECT_PROMPT = f"""You are an AI assistant that generates business presentation slide outlines.

Your primary inputs are:
1.  `goal`: The overall objective of the presentation.
2.  `context`: The audience and setting for the presentation.
3.  `db_config` (optional): A dictionary containing database connection details (`dbname`, `user`, `password`, `host`, `port`).

Your process is as follows:

1.  **Analyze Database Schema (if `db_config` is provided and not a placeholder):**
   HERE IS THE DATABASE SCHEMA:
{schemas}
    **Internally summarize these raw schemas in natural language for your own understanding.** Do NOT output this internal summary. This summary should describe the likely purpose of each table and its key columns based on their names and structure.

2.  **Generate Slide Outline as XML:**
    *   Based on the `goal`, `context`, and your internal understanding of the database schema (if available and summarized), create an XML document.
    *   The XML document must conform to the `schemas/slide_ideas.xsd` schema provided below.

{load_xml_output_schema(Config.SCHEMA_RELATIVE_PATH)}

IMPORTANT: Output ONLY the raw XML string. Do not wrap it in code blocks, JSON, or any other text.


"""

# Initialize the agent
deck_architect_agent = LlmAgent(
    name="SimpleDeckArchitectAgent",
    model=Config.MODEL_NAME,
    instruction=DECK_ARCHITECT_PROMPT,
    tools=[],
    output_key="simple_deck_slides_xml"
)

def clean_xml_string(text: str) -> str:
    """
    Clean XML string by removing markdown formatting and unnecessary whitespace.
    """
    # Remove markdown code block if present
    if text.startswith('```'):
        # Find the first and last ``` and extract content between them
        start = text.find('\n', 3) + 1  # Skip first line with ```xml
        end = text.rfind('```')
        if end > start:
            text = text[start:end].strip()

    text = text.replace('&', '&amp;')
    return text


async def run_architect_agent(initial_state: Dict[str, Any]) -> Optional[str]:
    """
    Run the deck architect agent to generate and process presentation slides.
    
    Args:
        initial_state (Dict[str, Any]): Initial state containing goal and context information.
        
    Returns:
        Optional[str]: The modified XML string if successful, None otherwise.
        
    Raises:
        Exception: If there's an error during the agent execution.
    """
    try:
        initial_state["db_config"] = Config.DB_CONFIG

        session_service = InMemorySessionService()
        session = await session_service.create_session(
            app_name=Config.APP_NAME, 
            user_id=Config.USER_ID, 
            session_id=Config.SESSION_ID, 
            state=initial_state
        )
        logger.info("Created session with state: %s", session.state)

        runner = Runner(
            agent=deck_architect_agent, 
            app_name=Config.APP_NAME, 
            session_service=session_service
        )
        
        initial_message_text = json.dumps({
            "goal": initial_state["goal"],
            "context": initial_state["context"]
        })
        initial_message = genai_types.Content(
            role='user',
            parts=[genai_types.Part(text=f"Generate presentation outline with the following state: {initial_message_text}")]
        )
        
        logger.info("Starting SimpleDeckArchitectAgent workflow")
        events_generator = runner.run_async(
            user_id=Config.USER_ID, 
            session_id=Config.SESSION_ID, 
            new_message=initial_message
        )

        async for event in events_generator:
            event_text = event.content.parts[0].text if event.content and event.content.parts else "No text content"
            actions_text = str(event.actions) if event.actions else "No actions"
            logger.info("Event - Author: %s, Content: '%s', Actions: %s", event.author, event_text, actions_text)

        final_session = await session_service.get_session(
            app_name=Config.APP_NAME, 
            user_id=Config.USER_ID, 
            session_id=Config.SESSION_ID
        )
        logger.info("SimpleDeckArchitectAgent interaction completed")
        
        if not final_session:
            logger.error("No final session found")
            return None
            
        logger.debug("Final session state: %s", json.dumps(final_session.state, indent=2, default=str))
        
        generated_slides_xml = final_session.state.get(deck_architect_agent.output_key)
        if not generated_slides_xml:
            logger.error("No output found in session state for key '%s'", deck_architect_agent.output_key)
            return None
            
        logger.debug("Generated presentation outline: %s", generated_slides_xml)
        
        generated_slides_xml = clean_xml_string(generated_slides_xml)

        schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), Config.SCHEMA_RELATIVE_PATH))
        schema_doc = etree.parse(schema_path)
        schema = etree.XMLSchema(schema_doc)
        
        try:
            xml_doc = etree.fromstring(generated_slides_xml.encode())
        except etree.XMLSyntaxError as e:
            logger.error("Failed to parse XML: %s", e)
            return None
            
        # # Add unique slideId to each SlideIdea element with proper namespace
        # ns_uri = Config.XML_NAMESPACE["ns"]
        # for slide_idea in xml_doc.findall("ns:SlideIdea", namespaces=Config.XML_NAMESPACE):
        #     # Create SlideId element with proper namespace
        #     slide_id_elem = etree.Element(f"{{{ns_uri}}}SlideId")
        #     slide_id_elem.text = str(uuid.uuid4())
        #     slide_idea.insert(0, slide_id_elem)
            
        modified_xml = etree.tostring(xml_doc, encoding="unicode")
        
        if not schema.validate(xml_doc):
            logger.error("XML failed schema validation:")
            for error in schema.error_log:
                logger.error(str(error))
            return None
            
        logger.info("XML validated against schema successfully")
        return modified_xml
        
    except Exception as e:
        logger.error("Error in run_architect_agent: %s", str(e), exc_info=True)
        return None

if __name__ == "__main__":
    import asyncio
    try:
        initial_state = {
            "goal": "Boost Q4 Sales for New Eco-Product Line",
            "context": "Presenting to the executive board and marketing VPs.",
        }
        result = asyncio.run(run_architect_agent(initial_state))
        if result:
            logger.info("Successfully generated presentation outline")
        else:
            logger.error("Failed to generate presentation outline")
    except Exception as e:
        logger.error("Error running main_test_simple: %s", str(e), exc_info=True) 