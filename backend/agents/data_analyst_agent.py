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
    Your tasks are:
    1. Create insightful data analysis based on the 'slide_ideas.xml' and the database schemas provided below.
    2. Transmit those ideas with instructions to the script_agent. Make sure that the instructions use the actual names from the database schema to reduce confusion. The instructions should have the agent generate a JSON.
    3. Ensure that you include at least one piece of text and no more than 2 charts in your decision.
    
    The schema of the database is:
    {schemas}
"""

##In case we prefer this prompt later on
"""
    You are a data analyst. Your goal is to help create a data-driven presentation based on 'slide_ideas.xml' and the database schemas provided below. Your primary role is to plan the content and data linkages, not to format the final XML, but you MUST use exact database schema names.

    # Instructions for the data analyst agent
    Your tasks are:
    1. Create insightful data analysis based on the 'slide_ideas.xml' and the database schemas provided above.
    2. Transmit those ideas with instructions to the script_agent. Make sure that the instructions use the actual names from the database schema to reduce confusion. The instructions should have the agent generate a JSON.
    3. Ensure that you include at least one piece of text in your decision as a slide is likely to require it
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
        
    HERE IS THE DATABASE SCHEMA:
    {schemas}

    OUTPUT REQUIREMENTS:
    Your SOLE output must be a single, valid XML string that conforms to 'slide_schema.xsd'. This XML string will represent the structure of one or more slides.
    -   Each slide in your output XML should correspond to a 'SlideIdea' from the input.
    -   Populate slides with 'Chart' and 'Text' components as determined by your analysis.
    -   The 'id' attributes for slides and components should be meaningful (e.g., derived from 'SlideId' or descriptive of content).
    -   The 'Content' element within each 'Chart' or 'Text' component in your generated 'slide_schema.xml' MUST be a descriptive placeholder for the data. This placeholder will guide the `script_agent` in fetching and injecting the actual data.
        Example for a Chart:
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
            <Tooltip enabled="true" format="Revenue: $1000M"/>
            <Hover highlight="true"/>
          </Interactions>
        </ChartDefinition>
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
    -   Use the tailwind classes to have dynamic good looking slides.
            - For the outer most element, always define a background and some padding. py-8 px-16 are good values.
            - Make sure text has a good font size and colors. Colors should be opposite to the background.
            - You can use different shades and colors of backgrounds but be professional with those.
    -   Dont put more than 2 charts per slide.
    -   Keep the slides short and concise.
    -   Focus a lot on the wording and make the wording analytical and smart. Imagine being a CEO Presenting to the board.

    THIS IS THE ENTIRE SCHEMA YOU CAN USE:

    {SCHEMA}

    """
def get_script_instructions():
    

    return """
    You are a script writer. You will receive a textual plan from the analyst_agent (via `{+analysis_proposals}`). This plan will be a **natural language description** outlining the components and content for a presentation. This plan IS ALWAYS considered complete and sufficient in its informational content. Your primary responsibility is to **interpret this textual plan and construct the final valid `slide_schema.xml` string by meticulously and strictly following the described intentions**, execute the specified data operations, and populate the content exactly as guided by the plan.

    The analyst's textual plan will describe:
    *   The intended `SlideId` for different sections or ideas.
    *   The desired `ComponentType` (`Text` or `Chart`) for each part of a slide.
    *   `InstructionsForContent`: Natural language descriptions of what data is needed, what text should be generated, or what a chart should visualize. You MUST carefully interpret these instructions to extract precise details for data fetching/processing (including exact schema names where mentioned), text construction, or chart data preparation to JSON and the visualization goal. Trust the correctness of the information provided within these descriptions.

    **Your Tools and Their Purpose:**
    You have the following tools at your disposal to accomplish your tasks:
    *   `execute_sql_query`: Use this tool to run SQL queries against the database. The analyst's instructions will often specify the exact queries or the data points required, which you'll translate into SQL queries using the schema names mentioned in the plan.
    *   `CodeInterpreterTool`: Use this tool to execute Python code. This is essential for any data manipulation, calculations, transformations, or formatting (e.g., preparing JSON for charts) that goes beyond simple SQL queries, as guided by the analyst's `InstructionsForContent`.
    *   `visualizer_tool`: This tool is specifically for generating the XML definition of charts. You will pass it JSON data (prepared by you using the `CodeInterpreterTool` or from `execute_sql_query` and then processed) AND the visualization goal/description for the chart (extracted from the analyst's `InstructionsForContent`). The output of this tool is XML that should be embedded within a `<Chart>` component's `<Content>` tag, typically wrapped in CDATA.
    *   `FileWritingTool`: Use this tool if you need to write data to a file, though your primary output is the final `slide_schema.xml` string.

    Your tasks are:
    1.  **Interpret Analyst's Textual Plan:** Carefully read and understand the natural language plan from `{+analysis_proposals}`. Your goal is to extract the structure of the presentation, the components for each slide, and the specific data and content requirements for each component as described by the analyst.
    2.  **Construct SlideDeck XML:** Based on your interpretation of the textual plan, you will build the entire XML structure (`<SlideDeck>`, `<Slide id="...">`, `<Text ...>`, `<Chart ...>`) according to `slide_schema.xsd`, ensuring it accurately reflects the analyst's described intentions.
    3.  **Execute and Populate Content:** For each component you identify from the analyst's textual plan:
        *   Create the appropriate XML element (e.g., `<Text tag="p">` or `<Chart type="bar">`). Assign classes or other attributes as guided by the plan, or use sensible defaults if not explicitly detailed.
        *   Carefully analyze the analyst's natural language `InstructionsForContent` for that component and execute them precisely using your tools as appropriate.
        *   Use your tools (`execute_sql_query`, `CodeInterpreterTool`) to perform the data operations (SQL queries, Python calculations) *exactly* as understood from the analyst's instructions, **paying close attention to any mentioned schema names.** Do not infer, alter, or question the core requirements described.
        *   **For `Text` components:**
            *   Generate the final text string by synthesizing the information and directives in the `InstructionsForContent`, potentially using your tools to fetch or calculate data to be included in the text.
            *   Place this text inside the `<Content>` tag of the `<Text>` element you created.
        *   **For `Chart` components:**
            *   Prepare data in **JSON format** as guided by the `InstructionsForContent`, using `execute_sql_query` to fetch raw data and `CodeInterpreterTool` for transformation and JSON structuring.
            *   Use your `visualizer_tool`, passing it BOTH the prepared JSON data AND the visualization goal/description extracted from the `InstructionsForContent`.
            *   Ensure the `visualizer_tool`'s output XML (which should include the data) is complete. Place this entire CDATA-wrapped XML output from `visualizer_tool` inside the `<Content>` tag of the `<Chart>` element you created.
        *   Add the fully formed component XML to the correct `<Slide id="...">` (as interpreted from the plan) within your overall `<SlideDeck>` structure.
    4.  **Error Handling for Individual Components:** If any step in processing a *specific component described in the plan* fails (e.g., data generation error from a tool, `visualizer_tool` error, or ambiguity in interpretation that cannot be resolved), that entire component MUST BE OMITTED from the final `slide_schema.xml`. Log the specific error if possible and continue to process other described components. The failure of one component does not invalidate the overall presentation goal.
    5.  **Output Requirement:** Your SOLE and FINAL output MUST be a single, valid XML string, representing the complete `slide_schema.xml`. This XML must contain all successfully processed components, correctly structured according to `slide_schema.xsd` and your interpretation of the analyst's textual plan.
    6.  If the `InstructionsForContent` for a component, as interpreted, lead to an issue where data cannot be retrieved or processed, this is an issue with that component's execution. Omit that component as per instruction #4.
    7.  Ensure that the data parts of the output are in a format readable by D3.js, as would be prepared by following the analyst's JSON preparation guidance.
  
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



