import os
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

from crewai_tools import FileReadTool, DirectoryReadTool, FileWriterTool, CodeInterpreterTool
from google.adk.tools.crewai_tool import CrewaiTool

# Database connection parameters
DB_PARAMS = {
    'dbname': 'chinook',
    'user': 'postgres',
    'password': 'postgres',
    'host': 'localhost', # Assuming your Docker DB is running on localhost
    'port': '5432'
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
    try:
        # The global db_service instance is used here.
        # async with will call db_service.__aenter__ (connect) and db_service.__aexit__ (close)
        async with db_service as active_db_service:
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

# Instructions for the data analyst agent
DATA_ANALYST_INSTRUCTIONS = """
You are a data analyst. Your goal is to help create a data-driven presentation based on 'slide_ideas.xml' and database schemas.

1.  **Understand Demand:** For each 'SlideIdea' in 'slide_ideas.xml', analyze its 'Title', 'ContentDescription', and 'DataInsights'.
2.  **Plan Data Generation:** Consult the provided database schemas. Determine how to extract or calculate insightful data from the database that directly addresses the demands of each 'SlideIdea'.
3.  **Instruct Script Agent:**
    *   If you identify a way to generate relevant data for a 'SlideIdea':
        *   For textual content: Instruct the script_agent on what data to find/calculate and how it should be used to create text that fulfills the 'SlideIdea'. Propose a `<Text>` component.
        *   For visualizations: Instruct the script_agent on (a) what data to prepare for a chart that fulfills the 'SlideIdea', and (b) a clear visualization goal/instruction for that data. State that the `script_agent` must use its `visualizer_tool`, passing it both the prepared data and this visualization goal/instruction. Propose a `<Chart>` component.
    *   If data from the database cannot adequately fulfill a 'SlideIdea', omit components for that idea.
4.  **Output Requirement:** Your sole output MUST be a single XML string. This XML string must comprehensively address the demands of the input 'slide_ideas.xml' by including components for all `SlideIdea`s that can be substantiated with data. The output must conform to 'slide_schema.xsd', containing only the `<Text>` and `<Chart>` components (within `<Slide>` and `<SlideDeck>`) for which you've provided instructions.

Example of instructing for a `<Chart>`:
'<Chart><Content>1. Data to prepare: Get total sales per product (e.g., as JSON). 2. Visualization goal for visualizer_tool: Create a bar chart of total sales for each product. 3. Action: Use visualizer_tool, providing it with the prepared data and this visualization goal.</Content></Chart>'

Example of instructing for a `<Text>`:
'<Text><Content>1. Data: Get total number of customers. 2. Text: Create a sentence stating "We have X active customers." using the fetched number.</Content></Text>'
"""

SCRIPT_INSTRUCTIONS = """
You are a script writer. You will receive a 'slide_schema.xml' from the analyst_agent. Your task is to populate this XML with data.

1.  **Input:** Parse the 'slide_schema.xml' provided by the analyst_agent (available in 'analysis_proposals').
2.  **Process Components:** For each `<Text>` and `<Chart>` component:
    *   Read the instructions in its `<Content>` tag.
    *   Use your tools (`execute_sql_query`, `CodeInterpreterTool`) to write and execute code (SQL, Python) to generate the data as instructed by the analyst.
    *   **For `<Text>` components:**
        *   Generate the text as per the analyst's instructions, ensuring it incorporates the fetched data and aligns with the original 'SlideIdea's' intent.
        *   Replace the `<Content>` with this final generated text.
    *   **For `<Chart>` components:**
        *   The analyst's instructions will specify (a) data to prepare and (b) a visualization goal/instruction.
        *   Prepare the data as instructed.
        *   Use your `visualizer_tool`, passing it BOTH the prepared data AND the analyst-provided visualization goal/instruction, to generate the chart XML.
        *   Replace the `<Content>` with the complete, CDATA-wrapped XML output from `visualizer_tool`.
3.  **Error Handling:** If you encounter an error while processing any component (e.g., data cannot be generated, a tool fails), that ENTIRE component (e.g., the full `<Text ...>...</Text>` or `<Chart ...>...</Chart>` block) MUST be OMITTED from your final XML output.
4.  **Output Requirement:** Your SOLE and FINAL output MUST be a single, valid XML string. This string must be the fully populated 'slide_schema.xml', containing only successfully processed components, and must conform to 'slide_schema.xsd'.

"""

# Define how agents should process and pass data
analyst_agent = Agent(
    name="analyst_agent",
    model=MODEL_GEMINI_2_5_FLASH,
    generate_content_config= types.GenerateContentConfig(
        temperature=0.5,
        max_output_tokens=1000
    ),
    description="An AI agent specialized in analyzing database schemas and proposing analyses.",
    instruction=DATA_ANALYST_INSTRUCTIONS,
    output_key="analysis_proposals"
)

script_agent = Agent(
    name="script_agent",
    model=MODEL_GEMINI_2_5_FLASH,
    description="An AI agent specialized in generating, running, and saving results from scripts, and using visualization tools.",
    instruction=SCRIPT_INSTRUCTIONS,
    tools=[FileWritingTool, CodeInterpreterTool, execute_sql_query, visualizer_tool],
)

seq_agent = SequentialAgent(
    name="data_analyst_and_script_agent",
    sub_agents=[analyst_agent, script_agent]
)

db_service = DatabaseService(DB_PARAMS)

if __name__ == "__main__":
    os.environ["GOOGLE_API_KEY"] = "AIzaSyClj9HUm6RcQcmMMSWQJ7vlFtilljrRUxw"
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"
    print(f"Agent '{seq_agent.name}' created using model '{MODEL_GEMINI_2_5_FLASH}'.")

    asyncio.run(db_service.connect())

    schemas = asyncio.run(db_service.get_table_schemas())

    asyncio.run(db_service.close())
    
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
        async for event in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=new_message):
            if event.is_final_response() and event.content and event.content.parts:
                final_response_content = event.content.parts[0].text
                #final_response_content = final_response_content.replace("```python", "").replace("", "")[:-3]
                #with open('analysis_proposals.py', 'w') as f:
                #    f.write(final_response_content)
        
    
        print(f"Agent: {final_response_content}")
    
    # Replace the original chat_with_agent call with the new pipeline
    
    chat_input = "We have a database whose schema is passed at the end of this message. I want you to generate an XML which follows the instruction of the XML below while harnessing the power of your dsata analysis tools, both for text and graphs/charts."
    
    xml_file = open('backend/agents/temp.xml', 'r').read()
    
    chat_input += "\n\n XML file: " + xml_file
    chat_input += "\n\n Schema of the database: " + str(schemas)
    
    asyncio.run(run_analysis_pipeline(chat_input))



