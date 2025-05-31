import React from "react";
import { D3ChartRenderer } from "./D3Charts";
import { chartsService, textComponentsService } from "@/db";
import { templateData } from "@/data/presentationTemplate";
import type { Chart, TextComponent } from "@/db";
import { cn } from "@/lib/utils";

interface SlideRendererProps {
  /** XML string representing the slide content */
  xml?: string;
  /** Additional CSS classes */
  className?: string;
}

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
  textComponents: Record<string, TextComponent>,
  charts: Record<string, Chart>
): React.ReactNode => {
  const tagName = element.tagName;
  const classes = element.getAttribute("classes") || "";
  const placeholder = element.getAttribute("placeholder") || "";
  const id = element.getAttribute("id") || Math.random().toString();

  switch (tagName) {
    case "Title": {
      const content = element.textContent?.trim() || "";
      return (
        <h1 key={id} className={cn("text-gray-900", classes)}>
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
      console.log("classes", classes);
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
      const chartComponentId =
        element.getAttribute("chartComponentId") ||
        element.getAttribute("chartId") ||
        element.getAttribute("id");
      const type = element.getAttribute("type") || "bar";

      if (chartComponentId && charts[chartComponentId]) {
        // Extract dataId from chart XML
        const chartXmlDoc = parseLayoutXML(charts[chartComponentId].xml);
        const dataSource = chartXmlDoc?.querySelector("DataSource");
        const dataId = dataSource?.getAttribute("dataId");

        console.log(`Chart ${chartComponentId}: dataId=${dataId}`);

        // Get data from templateData and ensure it's an array
        const rawData = dataId
          ? templateData[dataId as keyof typeof templateData]
          : undefined;
        let chartData: any[] | undefined;

        if (Array.isArray(rawData)) {
          chartData = rawData;
        } else if (
          rawData &&
          typeof rawData === "object" &&
          "nodes" in rawData
        ) {
          // For network data, pass the whole object but D3ChartRenderer will handle it
          chartData = rawData as any;
        }

        console.log(`Chart ${chartComponentId}: chartData=`, chartData);

        return (
          <D3ChartRenderer
            key={id}
            chartXml={charts[chartComponentId].xml}
            data={chartData}
            className={classes.toString()}
          />
        );
      }

      const contentElem = element.querySelector("Content");
      const fallbackText = contentElem?.textContent?.trim() || placeholder;
      return (
        <div
          key={id}
          className={`${classes.toString()} flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300`}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-sm text-gray-600">{type} Chart</div>
            <div className="text-xs text-gray-500">{fallbackText}</div>
          </div>
        </div>
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
            renderComponent(child, textComponents, charts)
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
  console.log("Debug: SlideRenderer xml:", xml);

  // Ensure hooks are always called before any early returns
  const [textComponents, setTextComponents] = React.useState<
    Record<string, TextComponent>
  >({});
  const [charts, setCharts] = React.useState<Record<string, Chart>>({});

  // Load text components and charts once
  React.useEffect(() => {
    (async () => {
      const [allTextComponents, allCharts] = await Promise.all([
        textComponentsService.getAll(),
        chartsService.getAll(),
      ]);
      setTextComponents(
        allTextComponents.reduce((acc, tc) => ({ ...acc, [tc.id]: tc }), {})
      );
      setCharts(
        allCharts.reduce((acc, chart) => ({ ...acc, [chart.id]: chart }), {})
      );
    })();
  }, []);

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
            {renderComponent(el, textComponents, charts)}
          </div>
        ))}
        {preText.map((el, idx) => (
          <div key={el.getAttribute("id") ?? `pre-${idx}`}>
            {renderComponent(el, textComponents, charts)}
          </div>
        ))}
        <div key={firstChart.getAttribute("id") ?? "chart-0"}>
          {renderComponent(firstChart, textComponents, charts)}
        </div>
        {postText.map((el, idx) => (
          <div
            key={el.getAttribute("id") ?? `post-${idx}`}
            className="col-span-2"
          >
            {renderComponent(el, textComponents, charts)}
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
            {renderComponent(el, textComponents, charts)}
          </div>
        ))}
        {textBefore.map((el, idx) => (
          <div key={el.getAttribute("id") ?? `tb-${idx}`}>
            {renderComponent(el, textComponents, charts)}
          </div>
        ))}
        {chartEls.map((el) => (
          <div key={el.getAttribute("id") ?? `chart-${el.getAttribute("id")}`}>
            {renderComponent(el, textComponents, charts)}
          </div>
        ))}
        {textAfter.map((el, idx) => (
          <div
            key={el.getAttribute("id") ?? `ta-${idx}`}
            className="col-span-2"
          >
            {renderComponent(el, textComponents, charts)}
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
      {children.map((child, index) =>
        renderComponent(child, textComponents, charts)
      )}
    </div>
  );
};

export default SlideRenderer;
