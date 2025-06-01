from google.adk.agents import Agent
from google.adk.tools import FunctionTool
import psycopg2
import os
import logging
import google.generativeai as genai
import re

logger = logging.getLogger(__name__)

# Configure google-generativeai
try:
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    genai.configure(api_key=google_api_key)
except ValueError as e:
    logger.error(f"Error configuring google-generativeai: {e}")
    # Potentially raise the error or handle it as appropriate for your application
    # For now, we'll log and continue, but the XML formatting tool will fail.


def postgres_query_tool(query: str):
    """A tool to query the PostgreSQL database. Input is a SQL query string. Returns the query results as a list of dictionaries."""
    try:
        conn = psycopg2.connect(
            host="db",
            database=os.getenv("POSTGRES_DB", "chinook"),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres")
        )
        cur = conn.cursor()
        cur.execute(query)
        # Fetch column names
        colnames = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        cur.close()
        conn.close()

        results = []
        for row in rows:
            results.append(dict(zip(colnames, row)))
        
        return str(results)
    except Exception as e:
        logger.error(f"Postgres query failed: {e}. Query: {query}")
        return f"Error connecting to or querying database: {e}"


SLIDE_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "slide_schema.xsd")
DB_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "chinook.md")

slide_schema_content = ""
try:
    print(f"Reading slide schema from {SLIDE_SCHEMA_PATH}")
    with open(SLIDE_SCHEMA_PATH, 'r') as file:
        slide_schema_content = file.read()
        print(f"Slide schema content: {slide_schema_content}")
except Exception as e:
    logger.error(f"Error reading slide schema {SLIDE_SCHEMA_PATH}: {e}")

db_schema_content = ""
try:
    with open(DB_SCHEMA_PATH, 'r') as file:
        db_schema_content = file.read()
except Exception as e:
    logger.error(f"Error reading DB schema {DB_SCHEMA_PATH}: {e}")

def format_text_to_xml_tool(text_to_format: str) -> str:
    """Formats given text into a structured XML string suitable for a presentation slide. Input is the text to format."""
    if not slide_schema_content:
        return "Error: Slide schema not loaded. Cannot format XML."
    # if not genai.conf.api_key:
    #     return "Error: GOOGLE_API_KEY not configured. Cannot format XML."

    model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
    prompt = f"""
    Format the following text into an XML structure conforming to the slide XML schema provided below.
    The goal is to create a valid XML representation of a presentation slide based on the input text.
    Ensure all content is properly escaped and the XML is well-formed.

    Please split the text into multi fields to make sense on a slide deck. YOu can also generate bar graphs
    inside <Chart> tag.
    For `Chart` components (Bar charts only)
    <Data>
        <Row>
            <Field name="example_name1" value="example_value1"/>
            <Field name="example_name2" value="example_value2"/>
        </Row>
        <!-- Additional Row elements as needed -->
    </Data>

    Slide XML Schema:
    ```xml
    {slide_schema_content}
    ```

    Text to format:
    ```
    {text_to_format}
    ```

    Formatted XML:
    """
    try:
        response = model.generate_content(prompt)
        raw_xml = response.text
        # Basic cleanup: remove markdown code fences if present
        cleaned_xml = re.sub(r"^```(?:xml)?\n", "", raw_xml, flags=re.MULTILINE)
        cleaned_xml = re.sub(r"\n```$", "", cleaned_xml, flags=re.MULTILINE).strip()
        
        # TODO: Add more robust XML validation/parsing here if needed (e.g., using lxml)
        # For now, we assume the LLM produces reasonably well-formed XML
        logger.info(f"Formatted XML: {cleaned_xml}")
        return cleaned_xml
    except Exception as e:
        logger.error(f"Error formatting text to XML: {e}")
        return f"Error during XML formatting: {e}"

# Instantiate tools
postgres_tool_instance = FunctionTool(postgres_query_tool)
xml_formatting_tool_instance = FunctionTool(format_text_to_xml_tool)

INSTRUCTIONS = f"""
As a data analyst, your primary goal is to extract relevant data from the PostgreSQL database using the `postgres_query_tool`,
perform analysis on this data, and then synthesize your findings into clear, concise text summaries.

After generating the textual summary of your findings for a slide, you MUST use the `format_text_to_xml_tool`
to convert your textual summary into a valid XML structure for the presentation slide.
Present the final XML as your output for the slide content.

DATABASE SCHEMA to help you write SQL queries:
{db_schema_content}

When using `format_text_to_xml_tool`, provide it with the complete textual content you want on the slide.
The tool will handle the XML structure based on the provided text and the slide schema.
Do not attempt to generate XML directly. Rely on `format_text_to_xml_tool` for all XML generation.
In the end, return the XML string.
"""

root_agent = Agent(
    name="data_analyst_agent",
    model="gemini-2.5-flash-preview-05-20",
    description="An agent that connects to PostgreSQL, analyzes data, and formats findings into XML for presentation slides.",
    instruction=INSTRUCTIONS,
    tools=[postgres_tool_instance, xml_formatting_tool_instance],
)
