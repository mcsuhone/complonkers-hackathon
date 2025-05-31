import os

def load_xml_output_schema(relative_path: str) -> str:
    """
    Load and return the XML schema for slide ideas validation.
    
    Returns:
        etree.XMLSchema: The loaded XML schema for validating slide ideas.
    
    Raises:
        FileNotFoundError: If the schema file cannot be found.
        etree.XMLSchemaParseError: If the schema is invalid.
    """
    with open(os.path.abspath(os.path.join(os.path.dirname(__file__), relative_path))) as f:
        return f.read()