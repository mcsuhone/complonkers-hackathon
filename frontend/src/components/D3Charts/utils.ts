import type { ChartConfig } from "./types";

// Mock data generators for different chart types
export const generateMockData = (chartType: string, fieldMappings: any[]) => {
  const dataSize = 10;

  switch (chartType) {
    case "bar":
    case "line":
    case "area":
      return Array.from({ length: dataSize }, (_, i) => ({
        category: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 100) + 10,
        date: new Date(2024, 0, i + 1),
      }));

    case "scatter":
    case "bubble":
      return Array.from({ length: dataSize }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 20 + 5,
        category: `Group ${(i % 3) + 1}`,
      }));

    case "pie":
    case "donut":
      return [
        { label: "Category A", value: 30 },
        { label: "Category B", value: 25 },
        { label: "Category C", value: 20 },
        { label: "Category D", value: 15 },
        { label: "Category E", value: 10 },
      ];

    default:
      return Array.from({ length: dataSize }, (_, i) => ({
        category: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 100) + 10,
      }));
  }
};

// Parse chart definition XML
export const parseChartXML = (xmlString: string): ChartConfig | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      console.error("XML parsing error:", parserError.textContent);
      return null;
    }

    const chartDef = xmlDoc.querySelector("ChartDefinition");
    if (!chartDef) return null;

    const chart = chartDef.querySelector("Chart");
    if (!chart) return null;

    // Extract basic chart information
    const chartType = chart.getAttribute("type") || "bar";
    const title = chart.querySelector("Title")?.textContent || "";
    const description = chart.querySelector("Description")?.textContent || "";

    // Set responsive dimensions (will be overridden by container)
    const dimensions = {
      width: 400,
      height: 300,
      responsive: true,
    };

    // Default margins
    const margin = {
      top: 40,
      right: 40,
      bottom: 60,
      left: 60,
    };

    // Extract encoding information for field mappings
    const encoding = chart.querySelector("Encoding");
    const fields: any[] = [];

    if (encoding) {
      // Handle different encoding types
      const xField = encoding.querySelector("X");
      const yField = encoding.querySelector("Y");
      const sizeField = encoding.querySelector("Size");
      const colorField = encoding.querySelector("Color");
      const fillField = encoding.querySelector("Fill");

      if (xField) {
        fields.push({
          name: xField.getAttribute("field"),
          role: "x",
          dataType: xField.getAttribute("type") || "string",
          title: xField.getAttribute("title"),
        });
      }

      if (yField) {
        fields.push({
          name: yField.getAttribute("field"),
          role: "y",
          dataType: yField.getAttribute("type") || "string",
          title: yField.getAttribute("title"),
        });
      }

      if (sizeField) {
        fields.push({
          name: sizeField.getAttribute("field"),
          role: "size",
          dataType: sizeField.getAttribute("type") || "string",
          title: sizeField.getAttribute("title"),
        });
      }

      if (colorField) {
        fields.push({
          name: colorField.getAttribute("field"),
          role: "color",
          dataType: colorField.getAttribute("type") || "string",
          title: colorField.getAttribute("title"),
        });
      }

      if (fillField) {
        fields.push({
          name: fillField.getAttribute("field"),
          role: "fill",
          dataType: fillField.getAttribute("type") || "string",
          title: fillField.getAttribute("title"),
        });
      }
    }

    // Extract styling
    const styling = chart.querySelector("Styling");
    const colorScheme =
      styling?.querySelector("ColorScheme")?.textContent || "category10";

    // Extract interactions
    const interactions = chart.querySelector("Interactions");
    const tooltip = interactions?.querySelector("Tooltip");
    const tooltipEnabled = tooltip?.getAttribute("enabled") !== "false";

    // Default axes configuration
    const axes = {
      x: {
        label: fields.find((f) => f.role === "x")?.title || "",
        scale: "linear",
        gridLines: false,
      },
      y: {
        label: fields.find((f) => f.role === "y")?.title || "",
        scale: "linear",
        gridLines: false,
      },
    };

    return {
      id: chart.getAttribute("id") || "",
      chartType,
      title,
      subtitle: description,
      dimensions,
      margin,
      axes,
      fields,
      colorScheme,
      tooltipEnabled,
    };
  } catch (error) {
    console.error("Error parsing chart XML:", error);
    return null;
  }
};
