import type { TextComponent } from "@/db";
import { textComponentsService } from "@/db";
import { cn } from "@/lib/utils";
import React from "react";
import { D3ChartRenderer } from "./D3Charts";

interface SlideRendererProps {
  /** XML string representing the slide content */
  xml?: string;
  /** Additional CSS classes */
  className?: string;
}

const PLACEHOLDER_SLIDE_XML = `<Slide id="Executive Summary">
    <Title>Executive Summary</Title>
    <Text tag="p">This section provides a concise overview of the company, its mission, the problem it solves, and its market potential. While specific details such as mission, problem statement, and market potential are typically derived from business strategy documents and external market research, this overview sets the stage for demonstrating the company's current traction and validating its position within its market through quantitative data insights. This investment opportunity focuses on a company with strong potential in a growing market, addressing a critical need with an innovative solution.</Text>
    <Chart id="annualRevenueBarChart" type="bar" title="Annual Revenue Trend" width="800" height="400">
      <Axes>
        <XAxis label="Year" scale="band"/>
        <YAxis label="Total Revenue" scale="linear"/>
      </Axes>
      <Legend show="false"/>
      <Data>
        <Row>
          <Field name="Year" value="2021"/>
          <Field name="Total Revenue" value="449.46"/>
        </Row>
        <Row>
          <Field name="Year" value="2022"/>
          <Field name="Total Revenue" value="481.45"/>
        </Row>
        <Row>
          <Field name="Year" value="2023"/>
          <Field name="Total Revenue" value="469.58"/>
        </Row>
        <Row>
          <Field name="Year" value="2024"/>
          <Field name="Total Revenue" value="477.53"/>
        </Row>
        <Row>
          <Field name="Year" value="2025"/>
          <Field name="Total Revenue" value="450.58"/>
        </Row>
      </Data>
    </Chart>
    <Chart id="annualUniqueCustomerActivityBarChart" type="bar" title="Annual Unique Customer Activity" width="800" height="500">
      <Axes>
        <XAxis label="Year" scale="band"/>
        <YAxis label="Number of Unique Customers" scale="linear"/>
      </Axes>
      <Data>
        <Row>
          <Field name="Year" value="2021"/>
          <Field name="Number of Unique Customers" value="46"/>
        </Row>
        <Row>
          <Field name="Year" value="2022"/>
          <Field name="Number of Unique Customers" value="46"/>
        </Row>
        <Row>
          <Field name="Year" value="2023"/>
          <Field name="Number of Unique Customers" value="47"/>
        </Row>
        <Row>
          <Field name="Year" value="2024"/>
          <Field name="Number of Unique Customers" value="47"/>
        </Row>
        <Row>
          <Field name="Year" value="2025"/>
          <Field name="Number of Unique Customers" value="46"/>
        </Row>
      </Data>
    </Chart>
  </Slide>`;

// Parse layout XML and extract chart/text references
const parseLayoutXML = (xmlString: string) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      console.error("XML parsing error:", parserError.textContent);
      return null;
    }

    return xmlDoc;
  } catch (error) {
    console.error("Error parsing layout XML:", error);
    return null;
  }
};

// Parse text component XML to extract content
const parseTextComponentXML = (xmlString: string) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const textElement = xmlDoc.querySelector("Content Text");
    return textElement?.textContent || "";
  } catch (error) {
    console.error("Error parsing text component XML:", error);
    return "";
  }
};

// Render individual components
const renderComponent = (
  element: Element,
  textComponents: Record<string, TextComponent>
): React.ReactNode => {
  const tagName = element.tagName;
  const classes = element.getAttribute("classes") || "";
  const placeholder = element.getAttribute("placeholder") || "";
  const id = element.getAttribute("id") || Math.random().toString();

  switch (tagName) {
    case "Title": {
      const content = element.textContent?.trim() || "";
      return (
        <h1 key={id} className={cn("text-gray-900", classes.toString())}>
          {content}
        </h1>
      );
    }
    case "Text": {
      const tag = element.getAttribute("tag") || "p";
      const contentElem = element.querySelector("Content");
      let content = contentElem?.textContent?.trim() || placeholder;
      if (!content) {
        const textComponentId =
          element.getAttribute("textComponentId") ||
          element.getAttribute("textId");
        if (textComponentId && textComponents[textComponentId]) {
          content =
            parseTextComponentXML(textComponents[textComponentId].xml) ||
            content;
        }
      }
      // Create the appropriate HTML element based on tag
      switch (tag) {
        case "h1":
          return (
            <h1 key={id} className={cn("text-gray-900", classes.toString())}>
              {content}
            </h1>
          );
        case "h2":
          return (
            <h2 key={id} className={cn("text-gray-900", classes.toString())}>
              {content}
            </h2>
          );
        case "h3":
          return (
            <h3 key={id} className={cn("text-gray-900", classes.toString())}>
              {content}
            </h3>
          );
        default:
          return (
            <p key={id} className={cn("text-gray-900", classes.toString())}>
              {content}
            </p>
          );
      }
    }

    case "Image": {
      const alt = element.getAttribute("alt") || "";
      const width = element.getAttribute("width");
      const height = element.getAttribute("height");

      return (
        <img
          key={id}
          className={classes}
          alt={alt}
          width={width || undefined}
          height={height || undefined}
          src="https://via.placeholder.com/400x300?text=Image+Placeholder"
        />
      );
    }

    case "Chart": {
      // This will be the actual XML of the <Chart> element, including its <Data> children
      const chartXmlContent = element.outerHTML;

      return (
        <D3ChartRenderer
          key={id}
          chartXml={chartXmlContent}
          // data prop is intentionally undefined as D3ChartRenderer will parse it
          className={classes.toString()}
        />
      );
    }

    case "List": {
      const ordered = element.getAttribute("ordered") === "true";
      const items = placeholder.split("\n").filter((item) => item.trim());

      const ListComponent = ordered ? "ol" : "ul";
      return (
        <ListComponent
          key={id}
          className={cn("text-gray-900", classes.toString())}
        >
          {items.map((item, index) => (
            <li key={index}>
              {item.replace(/^[•\-\*]\s*/, "").replace(/^\d+\.\s*/, "")}
            </li>
          ))}
        </ListComponent>
      );
    }

    case "Container": {
      const children = Array.from(element.children);
      return (
        <div key={id} className={classes.toString()}>
          {children.map((child, index) =>
            renderComponent(child, textComponents)
          )}
        </div>
      );
    }

    default:
      return null;
  }
};

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  xml,
  className = "",
}) => {
  // Ensure hooks are always called before any early returns
  const [textComponents, setTextComponents] = React.useState<
    Record<string, TextComponent>
  >({});
  // const [charts, setCharts] = React.useState<Record<string, Chart>>({}); // Removed as charts are now inline

  // Load text components and charts once
  React.useEffect(() => {
    (async () => {
      const [allTextComponents] = await Promise.all([
        textComponentsService.getAll(),
        // chartsService.getAll(), // Removed as charts are now inline
      ]);
      setTextComponents(
        allTextComponents.reduce((acc, tc) => ({ ...acc, [tc.id]: tc }), {})
      );
      // setCharts(
      //   allCharts.reduce((acc, chart) => ({ ...acc, [chart.id]: chart }), {})
      // );
    })();
  }, []);

  console.log("xml", xml);

  // Early return if xml not provided
  if (!xml) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-muted-foreground mb-2">⏳</div>
          <div className="text-sm text-muted-foreground">
            Loading slide content...
          </div>
        </div>
      </div>
    );
  }

  const xmlDoc = parseLayoutXML(xml);
  if (!xmlDoc) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-muted-foreground mb-2">⚠️</div>
          <div className="text-sm text-muted-foreground">
            Invalid layout XML
          </div>
        </div>
      </div>
    );
  }

  const slideElement = xmlDoc.querySelector("Slide");
  if (!slideElement) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-muted-foreground mb-2">⚠️</div>
          <div className="text-sm text-muted-foreground">
            No slide element found
          </div>
        </div>
      </div>
    );
  }

  const slideClasses = slideElement.getAttribute("classes") || "";
  const children = Array.from(slideElement.children);

  // Dynamic layout based on chart count
  const chartEls = children.filter((el) => el.tagName === "Chart");
  const titleEls = children.filter(
    (el) =>
      el.tagName === "Title" ||
      (el.tagName === "Text" && el.getAttribute("tag") === "h1")
  );
  if (chartEls.length === 1) {
    const otherEls = children.filter((el) => !titleEls.includes(el));
    const firstChart = chartEls[0];
    const preText = otherEls
      .slice(0, otherEls.indexOf(firstChart))
      .filter((el) => el.tagName === "Text");
    const postText = otherEls
      .slice(otherEls.indexOf(firstChart) + 1)
      .filter((el) => el.tagName === "Text");
    return (
      <div
        className={cn(
          slideClasses.toString(),
          className,
          "grid grid-cols-2 gap-4 text-gray-900"
        )}
      >
        {titleEls.map((el, idx) => (
          <div
            key={el.getAttribute("id") ?? `title-${idx}`}
            className="col-span-2"
          >
            {renderComponent(el, textComponents)}
          </div>
        ))}
        {preText.map((el, idx) => (
          <div key={el.getAttribute("id") ?? `pre-${idx}`}>
            {renderComponent(el, textComponents)}
          </div>
        ))}
        <div key={firstChart.getAttribute("id") ?? "chart-0"}>
          {renderComponent(firstChart, textComponents)}
        </div>
        {postText.map((el, idx) => (
          <div
            key={el.getAttribute("id") ?? `post-${idx}`}
            className="col-span-2"
          >
            {renderComponent(el, textComponents)}
          </div>
        ))}
      </div>
    );
  }
  if (chartEls.length === 2) {
    const [firstChart, secondChart] = chartEls;
    const firstIdx = children.indexOf(firstChart);
    const secondIdx = children.indexOf(secondChart);
    const textBefore = children.filter(
      (el) =>
        el.tagName === "Text" &&
        !titleEls.includes(el) &&
        children.indexOf(el) < firstIdx
    );
    const textAfter = children.filter(
      (el) => el.tagName === "Text" && children.indexOf(el) > secondIdx
    );
    return (
      <div
        className={cn(
          slideClasses.toString(),
          className,
          "grid grid-cols-2 gap-4 text-gray-900"
        )}
      >
        {titleEls.map((el, idx) => (
          <div
            key={el.getAttribute("id") ?? `title-${idx}`}
            className="col-span-2"
          >
            {renderComponent(el, textComponents)}
          </div>
        ))}
        {textBefore.map((el, idx) => (
          <div key={el.getAttribute("id") ?? `tb-${idx}`}>
            {renderComponent(el, textComponents)}
          </div>
        ))}
        {chartEls.map((el) => (
          <div key={el.getAttribute("id") ?? `chart-${el.getAttribute("id")}`}>
            {renderComponent(el, textComponents)}
          </div>
        ))}
        {textAfter.map((el, idx) => (
          <div
            key={el.getAttribute("id") ?? `ta-${idx}`}
            className="col-span-2"
          >
            {renderComponent(el, textComponents)}
          </div>
        ))}
      </div>
    );
  }
  // Default layout
  return (
    <div
      className={cn(
        slideClasses.toString(),
        className.toString(),
        "text-gray-900"
      )}
    >
      {children.map((child, index) => renderComponent(child, textComponents))}
    </div>
  );
};

export default SlideRenderer;
