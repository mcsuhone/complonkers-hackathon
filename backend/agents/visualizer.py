from os import getenv
from typing import Dict, Any, List
import json
from pathlib import Path
from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool


def load_schema() -> str:
    """Load the chart component schema from file."""
    schema_path = (
        Path(__file__)
        .parents[2]
        / "schemas"
        / "chart_component_schema.xsd"
    )
    with open(schema_path, "r") as f:
        return f.read()

# Create the visualizer agent
visualizer_agent = LlmAgent(
    name="visualizer",
    model="gemini-2.5-flash-preview-05-20",
    output_key="visualization_json",
    description="""A specialized agent that generates data visualizations based on input data and instructions.
    
    Input:
    - data: JSON data to visualize
    - instruction: String describing what to visualize
    
    Output:
    - visualization_json: Chart definition following the schema
    
    The agent automatically:
    1. Analyzes the data
    2. Picks the most suitable chart type
    3. Generates a complete chart definition""",
    
    instruction=f"""You are a data visualization agent that creates chart definitions based on data and instructions.

Your task is to:
1. Analyze the provided data
2. Choose an appropriate chart type based on the data and instruction
3. Generate a chart definition that follows the schema

The chart definition must follow this schema structure:
{load_schema()}

Keep visualizations clear and effective."""
)

visualizer_tool = agent_tool.AgentTool(agent=visualizer_agent)