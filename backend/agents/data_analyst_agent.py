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


db_service = DatabaseService(DB_PARAMS)
asyncio.run(db_service.connect())

schemas = asyncio.run(db_service.get_table_schemas())

asyncio.run(db_service.close())


# --- Step 1: Set up environment variables (Replace with your actual values) ---
# Ensure you have authenticated with `gcloud auth application-default login`
# if using Vertex AI. If using Google AI Studio API key, set GOOGLE_API_KEY.
# For Vertex AI:
os.environ["GOOGLE_API_KEY"] = "AIzaSyCKZyaHsS8rbn9MuCGE9xFg1vzAJQmUgWI"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"

MODEL_GEMINI_2_5_FLASH = "gemini-2.0-flash"

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
You are a highly skilled data analyst agent focused on finding insights in the data relevant to the demands of the user. Your primary goal is to examine database schemas you are provided with and propose insightful analyses that are relevant to the user's demands.

Your role is to:
1. Examine the database schemas you are provided with.
2. Propose analyses that could answer the user's demands.
3. Output the analysis proposals in a structured manner.

ITERATIVE ANALYSIS PROCESS:
After each analysis proposal, systematically ask yourself these questions:

1. DEPTH CHECK:
   - What deeper dimensions of the data could we explore?
   - Which variables deserve more detailed examination?
   - What outliers or special cases might be worth investigating?

2. CORRELATION CHECK:
   - What relationships between variables might be relevant to the user's demands?
   - How could different aspects of the data be combined?
   - What cause-effect relationships should we investigate?

3. BUSINESS INSIGHT CHECK:
   - What business questions could this data answer?
   - What industry-specific patterns should we look for?
   - What actionable recommendations could we derive?

4. STATISTICAL RIGOR CHECK:
   - What statistical tests would validate our hypotheses?
   - Which advanced statistical methods could we apply?
   - How can we ensure statistical significance?

5. COMPARATIVE ANALYSIS CHECK:
   - What time periods, categories, or segments should we compare?
   - What benchmarks or baselines could we establish?
   - What meaningful ratios or indices could we create?

OUTPUT FORMAT:
1. Analysis Title: Clear, descriptive name
2. Description: What we want to analyze and why
3. Required Data: Which tables and columns are needed
4. Data operations: What operations are needed to enact the analysis
5. Statistical Methods: What techniques should be used
6. Output a single proposal per demand
"""

SCRIPT_INSTRUCTIONS = """
You are a highly skilled script writer. Your role is to implement analyses proposed by the analyst agent, stored in the analysis_proposals state key, and report the results in a JSON file.
You have access to the following tools:
- FileWritingTool: Use this to write scripts and save results
- DirectoryReadTool: Use this to manage files
- execute_sql_query: Use this to execute SQL queries against the database to gather data and perform operations.
- CodeInterpreterTool: Use this to run other types of code if SQL is not sufficient (e.g., complex data manipulation in Python after fetching data).

Your responsibilities:

1. DATA RETRIEVAL AND ANALYSIS:
   - Preferably, make as few queries and as few scripts as possible.
   - Primarily, create SQL queries to retrieve and analyze data as per the analysis proposal.
   - Use the 'execute_sql_query' tool to run these SQL queries.
   - If an analysis requires complex processing beyond SQL capabilities, you can fetch raw data using 'execute_sql_query' and then use 'CodeInterpreterTool' with Python (e.g., pandas) to perform further processing. However, prefer SQL for direct database operations.
   - Do not add comments to SQL or Python code unless specifically complex.

2. OUTPUT AND STORAGE:
   - After executing a query or code, save the result as a JSON file.
   - Use 'FileWritingTool' to save results (e.g., as CSV or text files) in a 'results' directory.

OUTPUT FORMAT:
- Save the results obtained from executing the query/script. Saved to a separate file. Do not save the query/script itself.
- Ensure all generated files are stored in the 'results' directory.
- You MUST generate and save a JSON file that contains the data that answers the user's demand, and nothing else. This data could be a table, chart, or even a singular number, but it must be in a JSON format.
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
    description="An AI agent specialized in generating, running, and saving results from scripts.",
    instruction=SCRIPT_INSTRUCTIONS,
    tools=[FileWritingTool, DirectoryTool, CodeInterpreterTool, execute_sql_query],
)

seq_agent = SequentialAgent(
    name="data_analyst_and_script_agent",
    sub_agents=[analyst_agent, script_agent]
)

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
    async for event in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=new_message):
        if event.is_final_response() and event.content and event.content.parts:
            final_response_content = event.content.parts[0].text
            #final_response_content = final_response_content.replace("```python", "").replace("", "")[:-3]
            #with open('analysis_proposals.py', 'w') as f:
            #    f.write(final_response_content)
    

    print(f"Agent: {final_response_content}")

# Replace the original chat_with_agent call with the new pipeline

chat_input = "I have a database whose schema is passed at the end of this message. I want you to study the data and propose analyses that could answer the following demand:"

demand = "Get the percentage of total sales that rock represented in the year 2013"

chat_input += "\n\n Demand: " + demand
chat_input += "\n\n Schema of the database: " + str(schemas)

asyncio.run(run_analysis_pipeline(chat_input))



