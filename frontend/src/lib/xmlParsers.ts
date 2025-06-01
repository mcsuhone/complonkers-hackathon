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
  // const namespace = root.namespaceURI; // Namespace variable not strictly needed with childNodes iteration

  if (rootName === "Slide") {
    // If the root itself is a <Slide> element
    slideElems.push(root);
  } else if (rootName === "SlideDeck") {
    slideElems.push(root);
  } else {
    // If the root is <SlideDeck>, <Presentation>, or any other wrapper,
    // find <Slide> elements that are direct children of the root.
    const childNodes = root.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        // Check localName against "Slide".
        // This assumes "Slide" is the consistent localName for slide elements,
        // regardless of prefixes or default namespaces on parent/child.
        if (element.localName === "Slide") {
          slideElems.push(element);
        }
      }
    }
  }

  if (slideElems.length === 0) {
    // Updated error message to be more general
    console.error(
      `No <Slide> elements found to process directly or as children of root <${rootName}>`
    );
    return [];
  }

  const serializer = new XMLSerializer();
  return slideElems.map((el) => ({
    slideId: el.getAttribute("id") || "",
    classes: el.getAttribute("classes") || "",
    xml: serializer.serializeToString(el),
  }));
}
