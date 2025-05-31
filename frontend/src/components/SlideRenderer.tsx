import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

interface SlideRendererProps {
  layoutXml: string;
  content: string;
  isPresentation?: boolean;
}

// Mock chart data for demonstration
const mockChartData = [
  { name: "Q1", value: 400 },
  { name: "Q2", value: 300 },
  { name: "Q3", value: 600 },
  { name: "Q4", value: 800 },
];

// D3 Bar Chart Component
const D3BarChart: React.FC<{
  data: typeof mockChartData;
  className?: string;
}> = ({ data, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, width])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
      .nice()
      .range([height, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name) || 0)
      .attr("y", (d) => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.value))
      .attr("fill", "hsl(var(--primary))");

    // Add x axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    // Add y axis
    g.append("g").call(d3.axisLeft(y));
  }, [data]);

  return (
    <svg
      ref={svgRef}
      className={className}
      width="400"
      height="300"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
};

// Parse XML and extract slide elements
const parseSlideXML = (xmlString: string) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      console.error("XML parsing error:", parserError.textContent);
      return null;
    }

    const slide = xmlDoc.querySelector("Slide");
    return slide;
  } catch (error) {
    console.error("Error parsing XML:", error);
    return null;
  }
};

// Render individual XML elements
const renderElement = (
  element: Element,
  content: string,
  isPresentation: boolean = false
): React.ReactNode => {
  const tagName = element.tagName;
  const classes = element.getAttribute("classes") || "";
  const placeholder = element.getAttribute("placeholder") || "";
  const id = element.getAttribute("id") || "";

  // Use content for placeholders, fallback to placeholder text
  const displayText = content || placeholder || "Content here";

  switch (tagName) {
    case "Text": {
      const tag = element.getAttribute("tag") || "p";

      // Create the appropriate HTML element
      if (tag === "h1") {
        return (
          <h1
            key={id}
            className={classes}
            dangerouslySetInnerHTML={{ __html: displayText }}
          />
        );
      } else if (tag === "h2") {
        return (
          <h2
            key={id}
            className={classes}
            dangerouslySetInnerHTML={{ __html: displayText }}
          />
        );
      } else if (tag === "h3") {
        return (
          <h3
            key={id}
            className={classes}
            dangerouslySetInnerHTML={{ __html: displayText }}
          />
        );
      } else {
        return (
          <p
            key={id}
            className={classes}
            dangerouslySetInnerHTML={{ __html: displayText }}
          />
        );
      }
    }

    case "Image": {
      const alt = element.getAttribute("alt") || "Image";
      const width = element.getAttribute("width");
      const height = element.getAttribute("height");

      return (
        <div
          key={id}
          className={`${classes} bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}
        >
          <div className="text-center p-4">
            <div className="text-muted-foreground text-sm mb-2">📷</div>
            <div className="text-xs text-muted-foreground">{alt}</div>
            {placeholder && (
              <div className="text-xs text-muted-foreground mt-1">
                {placeholder}
              </div>
            )}
          </div>
        </div>
      );
    }

    case "Chart": {
      const chartType = element.getAttribute("type") || "bar";

      return (
        <div key={id} className={classes}>
          <div className="w-full h-full min-h-[200px] flex items-center justify-center">
            {chartType === "bar" ? (
              <D3BarChart data={mockChartData} className="w-full h-full" />
            ) : (
              <div className="w-full h-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="text-muted-foreground text-sm mb-2">📊</div>
                  <div className="text-xs text-muted-foreground">
                    {chartType} chart
                  </div>
                  {placeholder && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {placeholder}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "List": {
      const ordered = element.getAttribute("ordered") === "true";

      // Parse content as list items (split by newlines or use placeholder)
      const listItems = displayText.split("\n").filter((item) => item.trim());
      if (listItems.length === 0) {
        listItems.push("List item 1", "List item 2", "List item 3");
      }

      if (ordered) {
        return (
          <ol key={id} className={classes}>
            {listItems.map((item, index) => (
              <li key={index} className="mb-1">
                {item.trim()}
              </li>
            ))}
          </ol>
        );
      } else {
        return (
          <ul key={id} className={classes}>
            {listItems.map((item, index) => (
              <li key={index} className="mb-1">
                {item.trim()}
              </li>
            ))}
          </ul>
        );
      }
    }

    case "Container": {
      const children = Array.from(element.children);

      return (
        <div key={id} className={classes}>
          {children.map((child, index) =>
            renderElement(child, content, isPresentation)
          )}
        </div>
      );
    }

    default:
      return null;
  }
};

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  layoutXml,
  content,
  isPresentation = false,
}) => {
  const slideElement = parseSlideXML(layoutXml);

  if (!slideElement) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">⚠️</div>
          <div className="text-sm text-muted-foreground">
            Invalid slide layout
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Falling back to simple content display
          </div>
          <div className="mt-4 p-4 bg-muted/30 rounded">
            <p className="text-base">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  const slideClasses = slideElement.getAttribute("classes") || "";
  const slideId = slideElement.getAttribute("id") || "";
  const children = Array.from(slideElement.children);

  return (
    <div
      className={`w-full h-full ${slideClasses} ${
        isPresentation ? "min-h-[60vh]" : "min-h-[400px]"
      }`}
      data-slide-id={slideId}
    >
      {children.map((child, index) =>
        renderElement(child, content, isPresentation)
      )}
    </div>
  );
};

export default SlideRenderer;
