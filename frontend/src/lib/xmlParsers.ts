// XML parsing utilities for SlideIdeas and SlideDeck layouts

export interface SlideIdea {
  slideId: string;
  title: string;
  contentDescription: string;
  dataInsights: string;
}

export interface ParsedSlide {
  slideId: string;
  classes: string;
  xml: string;
}

// Parse SlideIdeas XML (validated against slide_ideas.xsd)
export function parseSlideIdeasXml(xmlString: string): SlideIdea[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const root = xmlDoc.documentElement;
  if (!root || root.localName !== "SlideIdeas") {
    console.error("Invalid SlideIdeas XML: root element is not SlideIdeas");
    return [];
  }
  const elems = Array.from(xmlDoc.getElementsByTagName("SlideIdea"));
  return elems.map((el) => ({
    slideId: el.querySelector("SlideId")?.textContent || "",
    title: el.querySelector("Title")?.textContent || "",
    contentDescription:
      el.querySelector("ContentDescription")?.textContent || "",
    dataInsights: el.querySelector("DataInsights")?.textContent || "",
  }));
}

// Parse XML (Slide, Presentation, or SlideDeck) and extract individual Slide elements
export function parseSlide(xmlString: string): ParsedSlide[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const root = xmlDoc.documentElement;
  if (!root) {
    console.error("Invalid XML: no root element found");
    return [];
  }
  const slideElems: Element[] = [];
  const rootName = root.localName;
  const namespace = root.namespaceURI;
  // If root is a single Slide, include it
  if (rootName === "Slide") {
    slideElems.push(root);
  } else {
    // For Presentation or SlideDeck, find child Slide elements
    if (namespace) {
      slideElems.push(
        ...Array.from(xmlDoc.getElementsByTagNameNS(namespace, "Slide"))
      );
    }
    if (slideElems.length === 0) {
      slideElems.push(...Array.from(xmlDoc.getElementsByTagName("Slide")));
    }
  }
  if (slideElems.length === 0) {
    console.error(`Invalid XML: no Slide elements found in root <${rootName}>`);
    return [];
  }
  const serializer = new XMLSerializer();
  return slideElems.map((el) => ({
    slideId: el.getAttribute("id") || "",
    classes: el.getAttribute("classes") || "",
    xml: serializer.serializeToString(el),
  }));
}
