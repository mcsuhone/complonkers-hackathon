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
from app.services.database_service import DatabaseService

from crewai_tools import FileReadTool, DirectoryReadTool, FileWriterTool
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
os.environ["GOOGLE_API_KEY"] = "AIzaSyB2_kZ9YSoysyaKyGz51GAAXxQgF3gNnXU"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"

MODEL_GEMINI_2_5_FLASH = "gemini-1.5-flash"

########################################################
# DEFINE TOOLS FOR AGENT
########################################################


DirectoryTool = CrewaiTool(
    tool=DirectoryReadTool(),
    name="DirectoryReadTool",
    description="Use this to read the contents of a directory.",
)

FileReadingTool = CrewaiTool(
    tool=FileReadTool(),
    name="FileReadTool",
    description="Use this to read the contents of a file.",
)
FileWritingTool = CrewaiTool(
    tool=FileWriterTool(),
    name="FileWriterTool",
    description="Use this to write to a file.",
)


########################################################
# DEFINE AGENT
########################################################

# Instructions for the data analyst agent
DATA_ANALYST_INSTRUCTIONS = """
You are a highly skilled data analyst agent focused on THEORETICAL analysis planning. Your primary goal is to examine database schemas and propose insightful analyses.
You have access to the following tools:
- inspect_schema: Use this to examine the database schema. You can:
  * Get the full schema (all tables, columns, foreign keys) by calling with an empty query.
  * Get specific schema information by providing an SQL query (e.g., 'SELECT * FROM information_schema.columns WHERE table_name = \'YourTable\';').
- DirectoryReadTool: Use this to manage files (e.g., to check for existing analysis scripts or results).

Your role is to:
1. First, use `inspect_schema` with an empty query to understand the overall database structure, including all tables, their columns, and foreign key relationships.
2. Based on this full schema, identify areas of interest or tables relevant to the user's request.
3. If needed, use `inspect_schema` again with specific SQL queries to get more detailed information about particular tables or relationships (e.g., using `information_schema` views).
4. Based on the schema, propose theoretical analyses that could yield valuable insights.
5. For each analysis, provide visualization suggestions.

When using `inspect_schema`:
- To get the full overview, call it with an empty string for the query: `inspect_schema(query='')`.
- For specific details, provide targeted SQL queries. Examples:
  - `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Album';`
  - `SELECT constraint_name, unique_constraint_name FROM information_schema.referential_constraints WHERE constraint_schema = 'public' AND table_name = 'Track';`
- Focus on understanding table structure, column data types, and how tables are related via foreign keys.

ITERATIVE ANALYSIS PROCESS:
After each analysis proposal, systematically ask yourself these questions:

1. DEPTH CHECK:
   - What deeper dimensions of the data could we explore?
   - Which variables deserve more detailed examination?
   - What outliers or special cases might be worth investigating?

2. CORRELATION CHECK:
   - What relationships between variables might be interesting?
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
For each analysis, provide:
1. Analysis Title: Clear, descriptive name
2. Description: What we want to analyze and why
3. Required Data: Which tables and columns are needed
4. Expected Insights: What we hope to learn
5. Statistical Methods: What techniques should be used
6. Business Value: How this analysis helps decision-making
7. Visualization Suggestions:
   - Type of visualization (e.g., bar chart, line plot)
   - Key variables to display
   - Color schemes or special formatting
   - Labels and annotations needed
   - Interactive elements if any
"""

SCRIPT_INSTRUCTIONS = """
You are a highly skilled script writer. Your role is to implement analyses proposed by the analyst agent, stored in the analysis_proposals state key.
You have access to the following tools:
- FileWritingTool: Use this to write scripts and save results
- DirectoryReadTool: Use this to manage files

Your responsibilities:

1. SCRIPT GENERATION:
   - Create a single Python script that implements all proposed analyses
   - Use SQL queries to write the code for the analyses, but do not run them.
   - Include proper error handling and data validation
   - Do not add comments to the code
   - Do not execute the code, just write it, and save it as 'analysis_script.py' in a results folder

2. SCRIPT STRUCTURE:
   - Import necessary libraries
   - Perform all analyses sequentially
   - Handle all potential errors
   - Make the script reusable for future data

OUTPUT:
- Use FileWritingTool to write a single script and save it as 'analysis_script.py' in the results folder
- Script should save all results in the 'results' directory
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
    tools=[inspect_schema, DirectoryTool, FileReadingTool],
    output_key="analysis_proposals"
)

script_agent = Agent(
    name="script_agent",
    model=MODEL_GEMINI_2_5_FLASH,
    description="An AI agent specialized in generating, running, and saving results from scripts.",
    instruction=SCRIPT_INSTRUCTIONS,
    tools=[FileWritingTool, DirectoryTool, FileReadingTool],
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

async def execute_analysis():
    # Create results directory if it doesn't exist
    if not os.path.exists('results'):
        os.makedirs('results')
    
    # Execute the generated script
    try:
        with open('analysis_script.py', 'r') as f:
            script_content = f.read()
            exec(script_content)
        print("Analysis completed successfully. Results saved in 'results' directory.")
    except Exception as e:
        print(f"Error executing analysis script: {str(e)}")

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
    
    # Execute the generated analysis script
    await execute_analysis()

    print(f"Agent: {final_response_content}")

# Replace the original chat_with_agent call with the new pipeline
asyncio.run(run_analysis_pipeline(
    "I have this music database called chinook. It is composed of multiple tables. I want you to study the data and propose analyses that could yield valuable insights. This is for a study of the music industry. so please find intriguing trends. If you find any analysis ideas, do not ask me for confirmation, just do it."
))



