import React, { useEffect, useRef, useState } from "react";
import { BarChart } from "./BarChart";
import type { D3ChartRendererProps } from "./types";
import type { BarChartData } from "./BarChart";

interface ChartConfig {
  id: string;
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

export const D3ChartRenderer: React.FC<D3ChartRendererProps> = ({
  chartId,
  chartXml,
  className = "",
}) => {
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
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!chartXml) {
      console.error(`No chart XML provided`);
      setConfig(null);
      setChartData([]);
      return;
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(chartXml, "text/xml");

    // The chartXml now directly contains the <Chart> element
    const chartElement = xmlDoc.documentElement;

    if (!chartElement || chartElement.tagName !== "Chart") {
      console.error("Invalid root element, expected <Chart>");
      setConfig(null);
      setChartData([]);
      return;
    }

    const chartType = chartElement.getAttribute("type") || "bar";
    const title = chartElement.getAttribute("title") || "";

    // Parse Data
    const dataElement = chartElement.querySelector("Data");
    let rawData: any[] = [];
    if (dataElement) {
      Array.from(dataElement.children).forEach((rowElement) => {
        if (rowElement.tagName === "Row") {
          const rowData: Record<string, any> = {};
          Array.from(rowElement.children).forEach((fieldElement) => {
            if (fieldElement.tagName === "Field") {
              const name = fieldElement.getAttribute("name");
              let value: any = fieldElement.getAttribute("value");
              if (
                value !== null &&
                !isNaN(parseFloat(value)) &&
                isFinite(parseFloat(value))
              ) {
                value = parseFloat(value);
              }
              if (name) {
                rowData[name] = value;
              }
            }
          });
          rawData.push(rowData);
        }
      });
    }

    // Dimensions - read directly from Chart attributes, falling back to responsive or default
    const chartWidth = parseInt(
      chartElement.getAttribute("width") || dimensions.width.toString(),
      10
    );
    const chartHeight = parseInt(
      chartElement.getAttribute("height") || dimensions.height.toString(),
      10
    );

    // Margins - using default values as they are not specified in the new simplified XML
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };

    // Axes labels - now <Axes> is a direct child of <Chart>
    const axesElement = chartElement.querySelector("Axes");
    const xEl = axesElement?.querySelector("XAxis");
    const yEl = axesElement?.querySelector("YAxis");

    const xAxisLabelField = xEl?.getAttribute("label");
    const yAxisLabelField = yEl?.getAttribute("label");

    let normalizedData: BarChartData[] = [];
    if (rawData.length > 0 && xAxisLabelField && yAxisLabelField) {
      normalizedData = rawData.map((row) => ({
        label: String(row[xAxisLabelField]),
        value: Number(row[yAxisLabelField]),
      }));
    }

    setConfig({
      id:
        chartId ||
        chartElement.getAttribute("id") ||
        `chart-${Math.random().toString(16).slice(2)}`,
      chartType,
      title,
      subtitle: chartElement.getAttribute("subtitle") || "",
      dimensions: { width: chartWidth, height: chartHeight, responsive: true },
      margin,
      axes: {
        x: {
          label: xEl?.getAttribute("label") || "",
          scale: xEl?.getAttribute("scale") || "linear",
          gridLines: xEl?.getAttribute("gridLines") === "true",
        },
        y: {
          label: yEl?.getAttribute("label") || "",
          scale: yEl?.getAttribute("scale") || "linear",
          gridLines: yEl?.getAttribute("gridLines") === "true",
        },
      },
      fields: Object.keys(rawData[0] || {}).map((key) => ({
        name: key,
        role: "",
        dataType: typeof rawData[0][key] === "number" ? "number" : "string",
        title: key,
      })),
      colorScheme:
        chartElement.querySelector("ColorScheme")?.textContent || "category10",
      tooltipEnabled:
        chartElement.querySelector("Tooltip")?.getAttribute("enabled") !==
        "false",
    });
    setChartData(normalizedData);
  }, [chartXml, chartId, dimensions]);

  if (!config || chartData.length === 0) {
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

  const { margin, chartType } = config;

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart
            data={chartData}
            width={config.dimensions.width}
            height={config.dimensions.height}
            margin={margin}
          />
        );
      default:
        return (
          <div className="text-sm text-muted-foreground text-center">
            Unsupported chart type: {chartType}
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
