import React, { useEffect, useRef, useState } from "react";
import { BarChart } from "./BarChart";
import type { D3ChartRendererProps } from "./types";
import type { BarChartData } from "./BarChart";

interface ChartConfig {
  chartType: string;
  title: string;
  subtitle: string;
  dimensions: { width: number; height: number; responsive: boolean };
  margin: { top: number; right: number; bottom: number; left: number };
  axes: {
    x: { label: string; scale: string; gridLines: boolean };
    y: { label: string; scale: string; gridLines: boolean };
  };
  fields: Array<{
    name: string;
    role: string;
    dataType: string;
    title: string;
  }>;
  colorScheme: string;
  tooltipEnabled: boolean;
}

// Helper function to parse <Row> and <Field> elements from a <Data> node
const parseXmlDataRows = (dataElementNode: Element, outputArray: any[]) => {
  Array.from(dataElementNode.children).forEach((rowElement) => {
    if (rowElement.tagName === "Row") {
      const rowData: Record<string, any> = {};
      Array.from(rowElement.children).forEach((fieldElement) => {
        if (fieldElement.tagName === "Field") {
          const name = fieldElement.getAttribute("name");
          let value: any = fieldElement.getAttribute("value");
          const parsedFloat = parseFloat(value);
          if (
            value !== null &&
            !isNaN(parsedFloat) &&
            isFinite(parsedFloat) &&
            String(parsedFloat) === value
          ) {
            value = parsedFloat;
          }
          if (name) {
            rowData[name] = value;
          }
        }
      });
      outputArray.push(rowData);
    }
  });
};

export const D3ChartRenderer: React.FC<D3ChartRendererProps> = ({
  chartXml,
  className = "",
}) => {
  console.log("D3ChartRenderer: Received chartXml:", chartXml);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [config, setConfig] = useState<ChartConfig | null>(null);
  const [chartData, setChartData] = useState<BarChartData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const height = Math.max(300, width * 0.6); // Maintain aspect ratio
        setDimensions({ width: width || 400, height });
        console.log("D3ChartRenderer: Dimensions updated", { width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    console.log(
      "D3ChartRenderer: chartXml useEffect triggered. chartXml:",
      chartXml
    );
    if (!chartXml) {
      console.error(
        "D3ChartRenderer: No chart XML provided, clearing config and data."
      );
      setConfig(null);
      setChartData([]);
      return;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(chartXml, "text/xml");
      console.log("D3ChartRenderer: Parsed xmlDoc:", xmlDoc);

      const chartElement = xmlDoc.documentElement;
      console.log("D3ChartRenderer: chartElement:", chartElement);

      if (!chartElement || chartElement.tagName !== "Chart") {
        console.error(
          "D3ChartRenderer: Invalid root element, expected <Chart>. Actual:",
          chartElement?.tagName
        );
        setConfig(null);
        setChartData([]);
        return;
      }

      const chartType = chartElement.getAttribute("type") || "bar";
      const title = chartElement.getAttribute("title") || "";
      console.log("D3ChartRenderer: chartType:", chartType, "title:", title);

      let rawData: any[] = [];
      const directDataElement = chartElement.querySelector("Data");

      if (directDataElement) {
        console.log(
          "D3ChartRenderer: Found direct <Data> element. Parsing with helper."
        );
        parseXmlDataRows(directDataElement, rawData);
      } else {
        console.log(
          "D3ChartRenderer: No direct <Data> element found. Checking <Content>."
        );
        const contentElement = chartElement.querySelector("Content");
        if (contentElement?.textContent) {
          let contentStr = contentElement.textContent.trim();
          console.log(
            "D3ChartRenderer: Text content of <Content>:",
            contentStr
          );

          if (
            contentStr.startsWith("<Data>") &&
            contentStr.endsWith("</Data>")
          ) {
            console.log(
              "D3ChartRenderer: <Content> contains XML string. Parsing it."
            );
            try {
              const innerParser = new DOMParser();
              const innerXmlDoc = innerParser.parseFromString(
                contentStr,
                "text/xml"
              );
              const innerDataElement = innerXmlDoc.documentElement;
              if (innerDataElement && innerDataElement.tagName === "Data") {
                parseXmlDataRows(innerDataElement, rawData);
                console.log(
                  "D3ChartRenderer: Successfully parsed XML from <Content> via helper."
                );
              } else {
                console.error(
                  "D3ChartRenderer: Parsed XML from <Content> but root was not <Data>:",
                  innerDataElement?.tagName
                );
              }
            } catch (xmlParseError) {
              console.error(
                "D3ChartRenderer: Failed to parse XML string from <Content>:",
                xmlParseError,
                "String was:",
                contentStr
              );
            }
          } else {
            console.log(
              "D3ChartRenderer: <Content> does not appear to be <Data> XML string. Attempting JSON parse."
            );
            if (
              contentStr.startsWith("<![CDATA[") &&
              contentStr.endsWith("]]>")
            ) {
              contentStr = contentStr
                .substring(9, contentStr.length - 3)
                .trim();
              console.log(
                "D3ChartRenderer: Removed CDATA, attempting JSON parse on:",
                contentStr
              );
            }
            try {
              rawData = JSON.parse(contentStr);
              console.log(
                "D3ChartRenderer: Successfully parsed JSON from <Content>."
              );
            } catch (jsonError) {
              console.error(
                "D3ChartRenderer: Failed to parse JSON from <Content> (and not XML string):",
                jsonError,
                "Original string from content:",
                contentElement.textContent.trim()
              );
            }
          }
        } else {
          console.log(
            "D3ChartRenderer: No <Content> element with text found either."
          );
        }
      }
      console.log(
        "D3ChartRenderer: Extracted rawData (before filtering for BarChartData structure):",
        JSON.parse(JSON.stringify(rawData))
      );

      // Since normalization is removed, rawData is filtered to fit BarChartData[]
      let finalChartData: BarChartData[] = [];
      if (Array.isArray(rawData) && rawData.length > 0) {
        finalChartData = rawData
          .filter(
            (item: any) =>
              item &&
              typeof item.label === "string" &&
              typeof item.value === "number" &&
              !isNaN(item.value)
          )
          .map((item: any) => ({
            label: item.label as string,
            value: item.value as number,
          }));

        if (finalChartData.length !== rawData.length) {
          console.warn(
            "D3ChartRenderer: Some items in rawData did not conform to BarChartData structure ({label: string, value: number}) and were filtered out.",
            {
              originalCount: rawData.length,
              conformingCount: finalChartData.length,
              originalData: JSON.parse(JSON.stringify(rawData)),
            }
          );
        }
        console.log(
          "D3ChartRenderer: Data after filtering for BarChartData structure:",
          JSON.parse(JSON.stringify(finalChartData))
        );
      } else {
        console.log(
          "D3ChartRenderer: rawData is empty or not an array, so chartData will be empty."
        );
      }
      setChartData(finalChartData);

      const chartWidth = parseInt(
        chartElement.getAttribute("width") || dimensions.width.toString(),
        10
      );
      const chartHeight = parseInt(
        chartElement.getAttribute("height") || dimensions.height.toString(),
        10
      );
      const margin = { top: 40, right: 40, bottom: 60, left: 60 };

      const axesContainerElement = chartElement.querySelector("Axes");
      const xAxisElement =
        axesContainerElement?.querySelector('Axis[type="x"]');
      const yAxisElement =
        axesContainerElement?.querySelector('Axis[type="y"]');
      console.log(
        "D3ChartRenderer: XML xAxisElement:",
        xAxisElement,
        "XML yAxisElement:",
        yAxisElement
      );

      const newConfig: ChartConfig = {
        chartType,
        title: title || (finalChartData.length > 0 ? "Chart" : "Data Summary"), // Adjusted default title
        subtitle: chartElement.getAttribute("subtitle") || "",
        dimensions: {
          width: chartWidth,
          height: chartHeight,
          responsive: true,
        },
        margin,
        axes: {
          x: {
            label: xAxisElement?.getAttribute("label") || "Label",
            scale: xAxisElement?.getAttribute("scale") || "band",
            gridLines: xAxisElement?.getAttribute("gridLines") === "true",
          },
          y: {
            label: yAxisElement?.getAttribute("label") || "Value",
            scale: yAxisElement?.getAttribute("scale") || "linear",
            gridLines: yAxisElement?.getAttribute("gridLines") === "true",
          },
        },
        fields:
          finalChartData.length > 0 && finalChartData[0]
            ? Object.keys(finalChartData[0]).map((key) => ({
                name: key, // Will be 'label', 'value'
                role:
                  key === "label"
                    ? "dimension"
                    : key === "value"
                    ? "measure"
                    : "",
                dataType:
                  typeof (finalChartData[0] as any)[key] === "number"
                    ? "number"
                    : "string",
                title: key.charAt(0).toUpperCase() + key.slice(1),
              }))
            : [],
        colorScheme:
          chartElement.querySelector("ColorScheme")?.textContent ||
          "category10",
        tooltipEnabled:
          chartElement.querySelector("Tooltip")?.getAttribute("enabled") !==
          "false",
      };
      console.log("D3ChartRenderer: Setting newConfig:", newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error(
        "D3ChartRenderer: Error parsing chart XML or setting up config:",
        error
      );
      setConfig(null);
      setChartData([]);
    }
  }, [chartXml, dimensions]);

  console.log(
    "D3ChartRenderer: Current state before render decision - config:",
    config,
    "chartData:",
    chartData
  );

  if (!config || chartData.length === 0) {
    console.log(
      "D3ChartRenderer: Rendering 'Invalid chart configuration or no data' message."
    );
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center h-64 ${className}`}
      >
        <div className="text-center">
          <div className="text-muted-foreground mb-2">⚠️</div>
          <div className="text-sm text-muted-foreground">
            Invalid chart configuration or no data
          </div>
        </div>
      </div>
    );
  }

  console.log(
    "D3ChartRenderer: Proceeding to render chart. Type:",
    config.chartType
  );
  const { margin, chartType: configChartType } = config;

  const renderChart = () => {
    switch (configChartType) {
      case "bar":
        console.log(
          "D3ChartRenderer: Rendering BarChart with data:",
          chartData,
          "config:",
          config
        );
        return (
          <BarChart
            data={chartData}
            width={config.dimensions.width}
            height={config.dimensions.height}
            margin={margin}
          />
        );
      default:
        console.warn(
          "D3ChartRenderer: Unsupported chart type:",
          configChartType
        );
        return (
          <div className="text-sm text-muted-foreground text-center">
            Unsupported chart type: {configChartType}
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {renderChart()}
    </div>
  );
};
