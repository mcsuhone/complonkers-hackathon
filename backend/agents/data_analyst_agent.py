import os

import numpy as np
import pandas as pd
from io import StringIO
from google.adk.agents import Agent, SequentialAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
import asyncio
import psycopg2
from psycopg2.extras import RealDictCursor
from google.adk.tools import FunctionTool
from services.database_service import DatabaseService

from visualizer import visualizer_tool

from lib import load_xml_output_schema
from crewai_tools import FileReadTool, DirectoryReadTool, FileWriterTool, CodeInterpreterTool
from google.adk.tools.crewai_tool import CrewaiTool

# Database connection parameters
DB_PARAMS = {
    'dbname': 'chinook',
    'user': 'postgres',
    'password': 'postgres',
    'host': 'localhost', # Assuming your Docker DB is running on localhost
    'port': 5432
}


# --- Step 1: Set up environment variables (Replace with your actual values) ---
# Ensure you have authenticated with `gcloud auth application-default login`
# if using Vertex AI. If using Google AI Studio API key, set GOOGLE_API_KEY.
# For Vertex AI:

MODEL_GEMINI_2_5_FLASH = "gemini-2.5-flash-preview-05-20"

########################################################
# DEFINE TOOLS FOR AGENT
########################################################

DirectoryTool = CrewaiTool(
    tool=DirectoryReadTool(),
    name="DirectoryReadTool",
    description="Use this to read the contents of a directory.",
)

FileWritingTool = CrewaiTool(
    tool=FileWriterTool(),
    name="FileWriterTool",
    description="Use this to write to a file.",
)

# New async function for executing SQL queries using the global db_service
async def execute_sql_query(query: str) -> str:
    """
    Executes an SQL query against the Chinook database and returns the results as a string.
    Manages database connection (connects and closes) for each execution using the global db_service.
    Args:
        query: The SQL query string to be executed.
    Returns:
        A string representation of the query results or an error message.
    """
    db_service = DatabaseService(DB_PARAMS)
    try:
        # The global db_service instance is used here.
        # async with will call db_service.__aenter__ (connect) and db_service.__aexit__ (close)
        with db_service as active_db_service:
            active_db_service.cursor.execute(query)
            results = active_db_service.cursor.fetchall()
            # Convert list of DictRow objects to a string for the LLM
            return str([dict(row) for row in results])
    except Exception as e:
        return f"Error executing query \\'{query}\\': {str(e)}"



CodeInterpreterTool = CrewaiTool(
    tool=CodeInterpreterTool(),
    name="CodeInterpreterTool",
    description="Use this to run code.",
)


########################################################
# DEFINE AGENT
########################################################

def get_data_analyst_instructions():
    # service = DatabaseService(DB_PARAMS)
    # with service as db:
    #     schemas = db.get_table_schemas()
    schema = os.path.join(os.path.dirname(__file__), "chinook.md")
    with open(schema, 'r') as file:
        schemas = file.read()

    SCHEMA_RELATIVE_PATH = os.path.join("..", "..", "schemas", "slide_schema.xsd")

    SCHEMA = load_xml_output_schema(SCHEMA_RELATIVE_PATH)

    # Instructions for the data analyst agent
    return f"""
    # Instructions for the data analyst agent
    1. Read the database schemas provided below and come up with data analysis plans that would bring out insights from the data which answer the user' prompt.
    2. The data analysis plans should be in the form of a textual plan which outlines the components and content for a presentation.
    3. If you decide to use a chart, it can only be a Bar chart.
    4. You must include at least one text component in the presentation but must not include more two bar charts.
    5. The output of the data analysis plan should be in the form of a textual plan which outlines the operations needed to be performed on the data, while referencing the actual names of the columns from the database schemas.


    The schema of the database is:
    {schemas}
"""


##In case we prefer this prompt later on
"""
    You are a data analyst. Your goal is to help create a data-driven presentation based on 'slide_ideas.xml' and the database schemas provided below. Your primary role is to plan the content and data linkages, not to format the final XML, but you MUST use exact database schema names.

    # Instructions for the data analyst agent
    Your tasks are:
    

    {SCHEMA}

    """
def get_script_instructions():
    

    return """
    You are a script writer. You will receive a textual plan from the analyst_agent (via `{+analysis_proposals}`). This plan will be a **natural language description** outlining the components and content for **a single presentation slide**. This plan IS ALWAYS considered complete and sufficient in its informational content. Your primary responsibility is to **interpret this textual plan and construct the XML string for a single `<Slide>` element and its contents by meticulously and strictly following the described intentions**, execute the specified data operations, and populate the content exactly as guided by the plan.

    The analyst's textual plan will describe:
    *   The intended `SlideId` for the slide.
    *   The desired `ComponentType` (`Text` or `Chart`) for each part of the slide.
    *   `InstructionsForContent`: Natural language descriptions of what data is needed, what text should be generated, or what a chart should visualize. You MUST carefully interpret these instructions to extract precise details for data fetching/processing (including exact schema names where mentioned), text construction, or chart data preparation to JSON and the visualization goal. Trust the correctness of the information provided within these descriptions.
    *   If the desired component type is a chart, return a Chart component composed of a Data component, composed of Field components, whose values and names are the data obtained through operations
     
  
    **Your Tools and Their Purpose:**
    You have the following tools at your disposal to accomplish your tasks:
    *   `execute_sql_query`: Use this tool to run SQL queries against the database. The analyst's instructions will often specify the exact queries or the data points required, which you'll translate into SQL queries using the schema names mentioned in the plan.
    *   `CodeInterpreterTool`: Use this tool to execute Python code. This is essential for any data manipulation, calculations, transformations, or formatting (e.g., preparing JSON for charts) that goes beyond simple SQL queries, as guided by the analyst's `InstructionsForContent`.
    *   `visualizer_tool`: This tool generates the XML definition for charts. You will provide it with:
        1.  JSON data, prepared to logically represent rows and fields as an array of objects. This JSON must be self-contained with all necessary data values.
        2.  A visualization goal/description that **must explicitly state the required XML data structure: `<Data><Row><Field name=\"key\" value=\"value\"/></Row>...</Data>`. Crucially, this instruction must also specify that the chart data must be inline and the output XML from the tool MUST NOT contain any `<DataSource>` elements.**
        The tool's output XML, which will include the data formatted as per your explicit instruction (inline, no `<DataSource>`), should be embedded within a `<Chart>` component's `<Content>` tag (typically CDATA-wrapped).

    **Processing the Plan and Generating XML:**
    Your primary task is to convert the analyst's natural language plan (which describes a single slide) into the XML string for that `<Slide>` element.
    1.  **Interpret the Plan:** Carefully read the entire textual plan from `{+analysis_proposals}` to understand the intended components (`Text` or `Chart`) and the content/data requirements for the single slide.
    2.  **Build Slide Structure:** Create the `<Slide id="...">` element. The analyst's plan will guide the ID and content for this single slide.
    3.  **Process Each Component:** For each component described by the analyst for the slide:
        *   **For `Text` components:**
            *   Extract the intended textual content or the instructions to generate it from the analyst's plan.
            *   Use `execute_sql_query` or `CodeInterpreterTool` if data needs to be fetched or calculated to be part of the text.
            *   Create a `<Text>` XML element (e.g., `<Text tag="p">`) and place the generated text inside its `<Content>` tag.
            *   If the presentation is about a company, create the text part of the text component to be from someone who belongs to the company.
        *   **For `Chart` components (Bar charts only):**
            *   The analyst will describe what data the chart should show. Your goal is to produce an XML chart definition where the data part strictly follows this structure:
              ```xml
              <Data>
                <Row>
                  <Field name="example_name1" value="example_value1"/>
                  <Field name="example_name2" value="example_value2"/>
                </Row>
                <!-- Additional Row elements as needed -->
              </Data>
              ```
            *   **Data Preparation:** Use `execute_sql_query` to fetch raw data and then `CodeInterpreterTool` to transform this data into a **JSON array of objects**. Each object in the array represents one `<Row>`, and its key-value pairs will map to `<Field name=\"key\" value=\"value\"/>` elements. For instance: `[{"category": "A", "value": 10}, {"category": "B", "value": 20}]` would correspond to two rows.
            *   **Visualizer Tool Invocation:** Call the `visualizer_tool` by providing:
                1.  The structured JSON data (the array of objects you prepared, containing all data values directly).
                2.  A visualization goal/description. This description **MUST explicitly instruct the tool to format the data section of its XML output as `<Data><Row><Field name=\"key\" value=\"value\"/></Row>...</Data>` AND specify that the data must be inline, with NO `<DataSource>` ELEMENT in the output.** Also, specify that it's a 'bar' chart.
            *   **Embed Output:** The `visualizer_tool` will return a complete XML definition for the chart. Take this entire XML output (usually CDATA-wrapped) and place it inside the `<Content>` tag of the `<Chart type="bar">` element you are constructing for the slide.
        *   Add the fully formed component XML (`<Text>` or `<Chart>`) into your `<Slide>` XML structure.
    4.  **Final Output:** Ensure your final output is an XML string representing a single, complete `<Slide>` element. This `<Slide>` element and its contents must be structured according to the principles of `slide_schema.xsd` for a slide. It should contain all successfully processed components for that slide. If a component cannot be processed due to an error in its execution or data retrieval as per the plan, it should be omitted from the slide.

    """

def get_analyst_agent():
    # Define how agents should process and pass data
    return Agent(
        name="analyst_agent",
        model=MODEL_GEMINI_2_5_FLASH,
        generate_content_config= types.GenerateContentConfig(
            temperature=1,
        ),
        description="An AI agent specialized in analyzing database schemas and proposing analyses.",
        instruction=get_data_analyst_instructions(),
        output_key="analysis_proposals"
    )

def get_script_agent():
    return Agent(
        name="script_agent",
        model=MODEL_GEMINI_2_5_FLASH,
        description="An AI agent specialized in generating, running, and saving results from scripts, and using visualization tools.",
        instruction=get_script_instructions(),
        tools=[FileWritingTool, CodeInterpreterTool, execute_sql_query, visualizer_tool],
    )

def get_sequential_agent():
    
    return SequentialAgent(
        name="data_analyst_and_script_agent",
        sub_agents=[get_analyst_agent(), get_script_agent()]
    )


########################################################
# RUN THE AGENT FOR TESTING
########################################################

if __name__ == "__main__":
    os.environ["GOOGLE_API_KEY"] = "AIzaSyDQ3Jc_1TX3v84CVVkK9QeNF-nE_tKzFYM"
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"

    seq_agent = get_sequential_agent()

    print(f"Agent '{seq_agent.name}' created using model '{MODEL_GEMINI_2_5_FLASH}'.")
    
    session_service = InMemorySessionService()
    
    # Define constants for identifying the interaction context
    APP_NAME = "data_analyst_app"
    USER_ID = "user_1"
    SESSION_ID = "session_001" # Using a fixed ID for simplicity
    
    # Create the specific session where the conversation will happen
    async def create_session():
        # Create a session (or get existing one)
        return await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    
    # Initialize session and runner
    session = asyncio.run(create_session())
    print(f"Session created: App='{APP_NAME}', User='{USER_ID}', Session='{SESSION_ID}'")
    
    # --- Runner ---
    # Key Concept: Runner orchestrates the agent execution loop.
    runner = Runner(
        agent=seq_agent, # The agent we want to run
        app_name=APP_NAME,   # Associates runs with our app
        session_service=session_service # Uses our session manager
    )
    print(f"Runner created for agent '{runner.agent.name}'.")   
    
    from google.genai import types # For creating message Content/Parts
    
    async def run_analysis_pipeline(query: str):
        print(f"\nUser: {query}")
        new_message = types.Content(role="user", parts=[types.Part(text=query)])
    
        # Run the sequential agent
        final_response_content = ""
        async for event in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=new_message):
            if event.is_final_response() and event.content and event.content.parts:
                final_response_content = event.content.parts[0].text
        
        # Retrieve the session state after the agent run
        current_session_state = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
        analysis_proposals_output = current_session_state.state
        
        if analysis_proposals_output:
            print("\n--- Analyst Agent Output (analysis_proposals) ---")
            print(analysis_proposals_output)
            print("--- End of Analyst Agent Output ---")
        else:
            print("\n'analysis_proposals' not found in session state or is empty.")

    
        print(f"\nScript Agent Final Output: {final_response_content}")
    
    # Replace the original chat_with_agent call with the new pipeline
    
    
    
    xml_file = open('backend/agents/test.xml', 'r').read()
    
    asyncio.run(run_analysis_pipeline(xml_file))



