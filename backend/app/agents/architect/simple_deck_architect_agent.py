import logging
import json
from typing import Dict, Any

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool, ToolContext

from app.services.database_service import DatabaseService

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

2.  **Generate Slide Outline:**
    *   Based on the `goal`, `context`, and your internal understanding of the database schema (if available and summarized), create a list of 2 to 4 slide objects for the main body of the presentation.
    *   If no database schema was available or usable, generate more generic slides based only on `goal` and `context`.

3.  **Output Format:**
    *   IMPORTANT: Your response must be ONLY a raw JSON array. Do not include any markdown formatting, code blocks, or other text.
    *   Each object in the array must have these three string keys:
        1.  "title": A concise slide title.
        2.  "content_description": A brief 1-2 sentence overview for this slide, connecting to the goal and context.
        3.  "data_insights": 1-2 sentences suggesting potential data points (referencing table/column concepts from your internal schema summary if relevant and available), analyses, or conceptual points for this slide. If no DB insights, provide generic placeholder text for data insights.

Example of the required output format (note: output only the JSON array, not this example text):
[
  {
    "title": "Understanding Customer Needs & Market Performance",
    "content_description": "This section will analyze customer feedback and recent sales performance to identify key areas for the new product line.",
    "data_insights": "Utilize insights from the 'customer_feedback' table to highlight desired features. Analyze 'sales_trends' to show market gaps the new product can fill."
  },
  {
    "title": "Proposed Product Features & Eco-Innovations",
    "content_description": "Detailing the key features of the new eco-friendly product line and their innovative aspects.",
    "data_insights": "Highlight features based on 'product_prototypes' table, focusing on 'sustainability_score' and unique 'material_cost' benefits. If no schema, suggest: 'Explore potential eco-friendly materials and their cost benefits.'"
  }
]

IMPORTANT: Output ONLY the raw JSON array. Do not wrap it in code blocks or add any other text."""

simple_deck_architect_agent = LlmAgent(
    name="SimpleDeckArchitectAgent",
    model=MODEL_NAME,
    instruction=SIMPLE_DECK_ARCHITECT_AGENT_PROMPT,
    tools=[db_schema_tool], 
    output_key="simple_deck_slides_json"
)

async def main_test_simple():
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
    

    initial_state = {
        "goal": "Boost Q4 Sales for New Eco-Product Line",
        "context": "Presenting to the executive board and marketing VPs.",
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
        
        generated_slides_json = final_session.state.get(simple_deck_architect_agent.output_key)
        if generated_slides_json:
            print("\nGenerated Presentation Outline (JSON string from LlmAgent output_key):")
            print(generated_slides_json)
            try:
                parsed_slides = json.loads(generated_slides_json)
                print("\nParsed Presentation Outline:")
                print(json.dumps(parsed_slides, indent=2))
            except json.JSONDecodeError as e:
                print(f"\nCould not parse the generated JSON: {e}")
        else:
            print(f"\nNo output found in session state for key '{simple_deck_architect_agent.output_key}'.")
    else:
        print("No final session found.")
    print("-------------------------------\n")

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(main_test_simple())
    except Exception as e:
        logger.error(f"Error running main_test_simple: {e}", exc_info=True) 