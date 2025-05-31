import pathlib
from lxml import etree
import io

def get_schema():
    # Locate the XSD in the project root's schemas directory
    schema_path = pathlib.Path(__file__).resolve().parent.parent.parent / 'schemas' / 'slide_layout_schema.xsd'
    xmlschema_doc = etree.parse(str(schema_path))
    return etree.XMLSchema(xmlschema_doc)

# Sample with content mode
CONTENT_XML = """<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="slide1">
    <Text mode="content" tag="h1">
      <Content>Hello World</Content>
    </Text>
  </Slide>
</SlideDeck>
"""

# Sample with instructions mode
INSTRUCTIONS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="slide2">
    <Chart mode="instructions" type="bar">
      <Instructions>Generate a bar chart of quarterly sales</Instructions>
    </Chart>
  </Slide>
</SlideDeck>
"""

def test_content_valid():
    schema = get_schema()
    doc = etree.parse(io.StringIO(CONTENT_XML))
    # Should not raise
    schema.assertValid(doc)

def test_instructions_valid():
    schema = get_schema()
    doc = etree.parse(io.StringIO(INSTRUCTIONS_XML))
    # Should not raise
    schema.assertValid(doc) 