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

db_service = DatabaseService(DB_PARAMS)

asyncio.run(db_service.connect())

schemas = asyncio.run(db_service.get_table_schemas())

asyncio.run(db_service.close())



# Instructions for the data analyst agent
DATA_ANALYST_INSTRUCTIONS = f"""
You are a data analyst. Your goal is to help create a data-driven presentation based on 'slide_ideas.xml' and database schemas. The database schema is as follows:

{schemas}

Your tasks are to:

1.  **Understand Demand:** For each 'SlideIdea' in 'slide_ideas.xml', analyze its 'Title', 'ContentDescription', and 'DataInsights'.
2.  **Plan Data Generation & Conceptual Inference:** Consult the provided database schemas. Determine how to extract or calculate **insightful and potentially complex data** from the database that directly addresses the demands of each 'SlideIdea'. 
    *   Consider the following to deepen your data analysis:
        *   **Relationships:** Can you join tables to reveal meaningful relationships relevant to the SlideIdea?
        *   **Calculated Metrics:** Instead of raw numbers, can you calculate percentages, averages, growth rates, ratios, or other derived metrics that provide more insight?
        *   **Comparisons & Segmentation:** Can you compare different segments of data (e.g., sales across categories, customer behavior over time if applicable, performance between different periods)?
        *   **Trends:** If date/time information is available, can you identify or instruct the script agent to calculate trends or changes over periods?
    *   **Conceptual Inference (Permitted):** While you must **never invent specific data figures or facts** not supported by the database, you ARE allowed and encouraged to infer less tangible concepts such as a company's mission, goals, strategic motivations, or market positioning if these can be reasonably derived from the textual content of the input 'slide_ideas.xml' (e.g., `Title`, `ContentDescription`) and/or are supported by patterns or insights from the actual data analysis. Use these inferences to shape the narrative instructions for the script_agent.
    Aim for analyses that go beyond simple aggregations if the 'SlideIdea' suggests a need for deeper understanding. However, ensure all proposed data-driven analyses are achievable by the script_agent using SQL queries and Python-based data manipulation.
3.  **Instruct Script Agent:**
    *   If you identify a way to generate relevant data for a 'SlideIdea' (and potentially related conceptual inferences):
        *   For textual content: Instruct the script_agent on what data to find/calculate (including any complex logic) and how it should be used, along with any inferred conceptual elements, to create text that fulfills the 'SlideIdea'. Propose a `<Text>` component.
        *   For visualizations: Instruct the script_agent on (a) what data to prepare for a chart that fulfills the 'SlideIdea' (this data might be the result of a complex query or calculation), and (b) a clear visualization goal/instruction for that data. This visualization goal must also explicitly state that the `visualizer_tool` should include the input data (the data used to generate the chart) within its output XML, ideally in a structured data section. State that the `script_agent` must use its `visualizer_tool`, passing it both the prepared data and this comprehensive visualization goal/instruction. Propose a `<Chart>` component.
    *   If data from the database (even when combined with reasonable conceptual inferences) cannot adequately fulfill a 'SlideIdea', omit components for that idea.
4.  **Output Requirement:** Your sole output MUST be a single XML string. This XML string must comprehensively address the demands of the input 'slide_ideas.xml' by including components for all `SlideIdea`s that can be substantiated with data and reasonable inferences. The output must conform to 'slide_schema.xsd', containing only the `<Text>` and `<Chart>` components (within `<Slide>` and `<SlideDeck>`) for which you've provided instructions.

Example of instructing for a `<Chart>`:
'<Chart><Content>1. Data to prepare: Calculate monthly sales growth rate for the last 12 months by joining 'invoices' and 'invoice_items', then summing totals per month and calculating percentage change. Output as JSON: [{{'month': 'YYYY-MM', 'growth_rate': 0.XX}}, ...]. 2. Visualization goal for visualizer_tool: Create a line chart showing monthly sales growth rate. Crucially, the output XML from visualizer_tool must include the input JSON data within a designated data section inside the chart XML. 3. Action: Use visualizer_tool, providing it with the prepared data and this comprehensive visualization goal.</Content></Chart>'

Example of instructing for a `<Text>`:
'<Text><Content>1. Data: Find the top 3 selling artists and their total revenue. Infer from SlideIdea Title ("Market Dominance") that the company aims to highlight its leading position. 2. Text: Create a statement like: "Our strong market dominance is evidenced by our top performers: [Artist1] ([Revenue1]), [Artist2] ([Revenue2]), and [Artist3] ([Revenue3]), showcasing significant sales leadership." using the fetched data and the inferred theme.</Content></Text>'
"""

SCRIPT_INSTRUCTIONS = """
You are a script writer. You will receive an XML string ('slide_schema.xml') from the analyst_agent, which defines the structure of a presentation. Your task is to populate this XML with data by processing its components.

The 'slide_schema.xml' you need to process is:
```xml
{+analysis_proposals}
```

Your main tasks are:
1.  **Input Processing:** Parse the 'slide_schema.xml' provided above. If the provided XML is empty or invalid, you might not be able to proceed.
2.  **Component Execution:** For each `<Text>` and `<Chart>` component found in the parsed XML:
    *   Read the specific instructions for that component, located within its `<Content>` tag.
    *   Use your available tools (`execute_sql_query`, `CodeInterpreterTool`) to write and execute the necessary code (SQL, Python) to generate or fetch the data as per the analyst's instructions for that component.
    *   **For `<Text>` components:**
        *   Based on the analyst's guidance, generate the final text string, ensuring it incorporates the fetched data and aligns with the original 'SlideIdea's' purpose.
        *   Replace the original instructions in the `<Content>` tag with this final generated text.
    *   **For `<Chart>` components:**
        *   The analyst's instructions will specify (a) the data to prepare and (b) a visualization goal/instruction.
        *   Prepare the data as instructed.
        *   Use your `visualizer_tool`, passing it BOTH the prepared data AND the analyst-provided visualization goal/instruction, to generate the chart XML.
        *   Replace the original instructions in the `<Content>` tag with the complete, CDATA-wrapped XML output from `visualizer_tool`.
3.  **Error Handling Protocol:** If you encounter an unrecoverable error while processing any specific component (e.g., data cannot be generated as instructed, a required tool fails for that component), that ENTIRE component (the full XML block, for instance, `<Text ...>...</Text>` or `<Chart ...>...</Chart>`) MUST BE OMITTED from your final XML output. Do not include error messages in place of content.
4.  **Output Mandate:** Your SOLE and FINAL output for this task MUST be a single, valid XML string. This string represents the fully populated 'slide_schema.xml', containing only the successfully processed (or appropriately modified) components, and must conform to the 'slide_schema.xsd' structure. If no components are successfully processed, the output might be a minimal valid XML structure like an empty SlideDeck or as appropriate based on the schema.

"""

# Define how agents should process and pass data
analyst_agent = Agent(
    name="analyst_agent",
    model=MODEL_GEMINI_2_5_FLASH,
    generate_content_config= types.GenerateContentConfig(
        temperature=1,
        max_output_tokens=2000
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
    
    
    
    xml_file = open('backend/agents/temp.xml', 'r').read()
    
    asyncio.run(run_analysis_pipeline(xml_file))



