from lxml import etree
import uuid

# Namespace for slide ideas and slide deck
NS_IDEAS = "http://www.complonkers-hackathon/slide_ideas"
NS_DECK = "http://www.complonkers-hackathon/slidedeck"


def analyze_slide_idea(slide_idea_elem):
    """
    Naively transform a SlideIdea element into a Slide element conforming to slide_schema.xsd.
    """
    # Extract slide idea components
    title_elem = slide_idea_elem.find(f"{{{NS_IDEAS}}}Title")
    content_desc_elem = slide_idea_elem.find(f"{{{NS_IDEAS}}}ContentDescription")
    data_insights_elem = slide_idea_elem.find(f"{{{NS_IDEAS}}}DataInsights")
    title = title_elem.text if title_elem is not None else ""
    content_desc = content_desc_elem.text if content_desc_elem is not None else ""
    data_insights = data_insights_elem.text if data_insights_elem is not None else ""

    # Determine slide id, prefer SlideId if provided
    slide_id_elem = slide_idea_elem.find(f"{{{NS_IDEAS}}}SlideId")
    slide_id = slide_id_elem.text if (slide_id_elem is not None and slide_id_elem.text) else str(uuid.uuid4())

    # Create Slide element in deck namespace
    slide_elem = etree.Element(f"{{{NS_DECK}}}Slide", nsmap={None: NS_DECK})
    slide_elem.set("id", slide_id)

    # Title as a heading
    text_title = etree.SubElement(slide_elem, f"{{{NS_DECK}}}Text")
    text_title.set("mode", "content")
    text_title.set("tag", "h2")
    content_title = etree.SubElement(text_title, f"{{{NS_DECK}}}Content")
    content_title.text = title

    # Content description as paragraph
    text_desc = etree.SubElement(slide_elem, f"{{{NS_DECK}}}Text")
    text_desc.set("mode", "content")
    text_desc.set("tag", "p")
    content_desc_sub = etree.SubElement(text_desc, f"{{{NS_DECK}}}Content")
    content_desc_sub.text = content_desc

    # Data insights as paragraph
    text_insights = etree.SubElement(slide_elem, f"{{{NS_DECK}}}Text")
    text_insights.set("mode", "content")
    text_insights.set("tag", "p")
    content_insights_sub = etree.SubElement(text_insights, f"{{{NS_DECK}}}Content")
    content_insights_sub.text = data_insights

    return slide_elem
