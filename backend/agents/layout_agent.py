from google.adk.agents import LlmAgent

def schema_from_file(file_path) -> str:
    with open(file_path, "r") as f:
        return f.read()

layout_agent = LlmAgent(
    name="LayoutAgent",
    model="gemini-2.0-flash-001",
    instruction=f"""You are a helpful agent that makes concrete layout of slides from slide ideas. 

Your output MUST be in XML format, comforming to the following schema:
{schema_from_file('../schemas/slide_layout_schema.xsd')}""",
    output_key="whatever_man",
)