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
os.environ["GOOGLE_API_KEY"] = "AIzaSyClj9HUm6RcQcmMMSWQJ7vlFtilljrRUxw"
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
You are a highly skilled data analyst agent. Your primary mission is to translate slide concepts, provided in a 'slide_ideas.xml' format, into a structured 'slide_schema.xml' presentation layout. You will use available database schemas to understand how to fetch the necessary data.

INPUT:
You will be provided with:
1. The content of a 'slide_ideas.xml'. This XML contains one or more 'SlideIdea' elements, each with 'SlideId', 'Title', 'ContentDescription', and 'DataInsights'.
2. Database schemas to understand available data tables and columns.

YOUR TASK:
For each 'SlideIdea' from the input 'slide_ideas.xml':
1.  Carefully analyze its 'ContentDescription' and 'DataInsights' fields. These fields dictate the information and visualizations required for the slide.
2.  Based on this analysis, determine:
    a.  Appropriate data visualizations (e.g., charts). These will become 'Chart' components in the output 'slide_schema.xml'.
    b.  Key statistics, facts, or textual summaries. These will become 'Text' components in the output 'slide_schema.xml'.
3.  Consult the provided database schemas to identify the specific tables and columns needed to generate the data for these charts and text elements.
4.  For each 'Chart' and 'Text' component you define in the output 'slide_schema.xml', its 'Content' element should act as a placeholder or a specific instruction for the `script_agent`. This placeholder should clearly describe the data to be fetched or the calculation to be performed.

GUIDING PRINCIPLES FOR ANALYSIS (using 'ContentDescription' and 'DataInsights'):

1.  VISUALIZATION CHOICE:
    *   What type of chart (bar, line, pie, etc., from 'ChartKindType' in 'slide_schema.xsd') would best represent the 'DataInsights'?
    *   What data dimensions are needed for this chart (e.g., categories, values, time series)?

2.  TEXTUAL CONTENT:
    *   What key statistics (e.g., percentages, totals, averages, trends) from the 'DataInsights' should be highlighted as text?
    *   What narrative points from 'ContentDescription' can be supported by data and presented as text?

3.  DATA REQUIREMENTS:
    *   Which database tables and columns contain the raw data needed?
    *   What calculations, aggregations (SUM, AVG, COUNT), or transformations are required on the raw data?

4.  FEASIBILITY:
    *   Ensure the requested data and visualizations are reasonably derivable from the provided database schemas.

OUTPUT REQUIREMENTS:
Your SOLE output must be a single, valid XML string that conforms to 'slide_schema.xsd'. This XML string will represent the structure of one or more slides.
-   Each slide in your output XML should correspond to a 'SlideIdea' from the input.
-   Populate slides with 'Chart' and 'Text' components as determined by your analysis.
-   The 'id' attributes for slides and components should be meaningful (e.g., derived from 'SlideId' or descriptive of content).
-   The 'Content' element within each 'Chart' or 'Text' component in your generated 'slide_schema.xml' MUST be a descriptive placeholder for the data. This placeholder will guide the `script_agent` in fetching and injecting the actual data.
    Example for a Chart:
    <Chart type="pie" id="salesDistributionChart" classes="w-1/2 h-64">
      <Content>Pie chart showing sales distribution by product category for the last quarter. Requires: product category, total sales amount per category.</Content>
    </Chart>

    Example for Text:
    <Text tag="h2" id="totalRevenueText" classes="text-xl font-bold">
      <Content>Total company revenue for the previous fiscal year. Requires: SUM(invoices.total) WHERE invoice_date is in previous fiscal year.</Content>
    </Text>
    <Text tag="p" id="insightSummaryText" classes="mt-2">
      <Content>Summary of key sales trends observed over the past 12 months. Requires: Monthly sales data, trend analysis (e.g., growth rate).</Content>
    </Text>

-   Do NOT invent data. Your role is to define the structure and specify WHAT data is needed for the `script_agent`.
-   The 'Content' elements are crucial for the `script_agent`. Make them clear and precise.
-   The output must be ONLY the XML string. Do not include any other explanatory text, greetings, or markdown formatting around the XML.
"""

SCRIPT_INSTRUCTIONS = """
You are a highly skilled script writer. Your primary role is to populate a `slide_schema.xml` with data, based on instructions embedded within it. The `slide_schema.xml` (which is the output from the `analyst_agent`) will be available in the `analysis_proposals` state key.

You have access to the following tools:
- `execute_sql_query`: Use this to execute SQL queries against the database to gather data.
- `CodeInterpreterTool`: Use this to run Python code for more complex data manipulation (e.g., using `pandas`, `numpy`) after fetching data with SQL, or for tasks not suitable for SQL, including advanced data science analyses using libraries like `scikit-learn`.
- `FileWritingTool`: Use *only* for saving intermediate complex data if it cannot be directly handled in memory or passed to another tool. **Do NOT use this tool to save the final output XML.**

Your responsibilities:

1.  **INPUT ANALYSIS AND PLANNING:**
    *   Retrieve the `slide_schema.xml` string from the `analysis_proposals` state key.
    *   Parse this XML structure thoroughly to understand all components and their data requirements specified in the `<Content>` tags.
    *   **Strategize Data Retrieval:** Before executing any code, develop a plan to fetch/generate all required data. Aim to **minimize the number of SQL queries**. If possible, craft single, more complex SQL queries to retrieve data for multiple components or related data points simultaneously.
    *   **Code Generation (Pre-computation):** Generate all necessary SQL queries and Python code snippets (for `CodeInterpreterTool`) required to populate *all* `<Content>` tags. This means you should have a collection of all code to be run before you start executing them.

2.  **CODE EXECUTION:**
    *   Execute the pre-generated SQL queries using `execute_sql_query`.
    *   Execute the pre-generated Python scripts using `CodeInterpreterTool`.
        *   For Python scripts, ensure they use libraries like `pandas` and `numpy` for data manipulation.
        *   If the instructions in `<Content>` imply advanced analysis (e.g., forecasting, classification, clustering, statistical modeling beyond basic aggregations) that cannot be achieved with SQL, `pandas`, or `numpy` alone, you **MUST** use appropriate data science methods and libraries (e.g., `scikit-learn`) within the `CodeInterpreterTool`.

3.  **DATA FORMATTING AND XML POPULATION:**
    *   For each piece of data retrieved or computed:
        *   Format it as a simple string. For chart data, this will typically be a JSON string (e.g., `[{"category": "A", "value": 10}, {"category": "B", "value": 20}]`). For text components, it will be the textual data itself (e.g., "Total Sales: $123,456" or "Key insight based on trend analysis...").
    *   Iterate through the parsed XML structure again.
    *   Replace the original instructional content within the `<Content>` tag of each `Chart` and `Text` component with the actual data string you've prepared and formatted.

    _Example - Before (Chart):_
    `<Chart type="pie" id="salesDistributionChart"><Content>Pie chart showing sales distribution by product category. Requires: product category, total sales.</Content></Chart>`
    _Example - After (Chart Content holds JSON data):_
    `<Chart type="pie" id="salesDistributionChart"><Content>[{"category": "Electronics", "sales": 1500}, {"category": "Books", "sales": 800}]</Content></Chart>`

    _Example - Before (Text):_
    `<Text tag="h2" id="totalRevenueText"><Content>Total company revenue for last year. Requires: SUM(invoices.total) for last year.</Content></Text>`
    _Example - After (Text Content holds the computed value):_
    `<Text tag="h2" id="totalRevenueText"><Content>Total Revenue: $575,000</Content></Text>`

4.  **OUTPUT:**
    *   Your SOLE and FINAL output MUST be the complete, updated `slide_schema.xml` string, with all relevant `<Content>` tags filled with their corresponding data.
    *   **ABSOLUTELY DO NOT** save this final XML to a file using `FileWritingTool`.
    *   **DO NOT** include any other explanatory text, greetings, or markdown formatting around the XML string. Just the pure XML string.

CODING STYLE:
   - Prioritize efficient SQL for data retrieval and manipulation directly within the database.
   - Use Python via `CodeInterpreterTool` for complex transformations, analyses not possible in SQL, or when advanced libraries (`pandas`, `numpy`, `scikit-learn`, etc.) are needed.
   - Ensure any code written (SQL or Python) is clean, directly serves the purpose of fetching/processing data for the `<Content>` tags, and is generated *before* execution. Minimize comments unless absolutely necessary for highly complex logic.
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
    tools=[FileWritingTool, CodeInterpreterTool, execute_sql_query],
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

chat_input = "We have a database whose schema is passed at the end of this message. I want you to study the data and propose answers to the missing data in the following XML schema:"

xml_file = open('backend/agents/temp.xml', 'r').read()

chat_input += "\n\n XML file: " + xml_file
chat_input += "\n\n Schema of the database: " + str(schemas)

asyncio.run(run_analysis_pipeline(chat_input))



