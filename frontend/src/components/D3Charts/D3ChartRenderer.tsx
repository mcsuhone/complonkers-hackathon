import React, { useRef, useEffect, useState } from "react";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { PieChart } from "./PieChart";
import { ScatterPlot } from "./ScatterPlot";
import { NetworkChart } from "./NetworkChart";
import { ChoroplethChart } from "./ChoroplethChart";
import { generateMockData, parseChartXML } from "./utils";
import type { D3ChartRendererProps, ChartConfig } from "./types";

export const D3ChartRenderer: React.FC<D3ChartRendererProps> = ({
  chartId,
  chartXml,
  data,
  className = "",
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [config, setConfig] = useState<ChartConfig | null>(null);
  const [chartData, setChartData] = useState<any>([]);
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
    // Use provided chartXml or fall back to registry lookup for backwards compatibility
    let xmlToUse = chartXml;
    if (!xmlToUse && chartId) {
      // Import the registry function only if needed for backwards compatibility
      import("../../data/chartRegistry").then(({ getChartDefinition }) => {
        const registryXml = getChartDefinition(chartId);
        if (registryXml) {
          const parsedConfig = parseChartXML(registryXml);
          if (parsedConfig) {
            // Override dimensions with responsive ones
            parsedConfig.dimensions = {
              ...parsedConfig.dimensions,
              ...dimensions,
            };
            setConfig(parsedConfig);
            const finalData =
              data ||
              generateMockData(parsedConfig.chartType, parsedConfig.fields);
            setChartData(finalData);
          }
        }
      });
      return;
    }

    if (!xmlToUse) {
      console.error(`No chart XML provided and no chartId for registry lookup`);
      return;
    }

    // Detect inline DataMapping-based charts (e.g. <DataSource type="inline" ...>)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlToUse, "text/xml");
    const inlineSource = xmlDoc.querySelector("DataSource[type='inline']");
    if (inlineSource) {
      // Parse ChartConfig section
      const chartDef = xmlDoc.querySelector("ChartDefinition");
      const cfg = xmlDoc.querySelector("ChartConfig");
      if (cfg) {
        const chartType = cfg.getAttribute("type") || "bar";
        const title = cfg.getAttribute("title") || "";
        // Dimensions
        const dimEl = cfg.querySelector("Dimensions");
        const width = dimEl
          ? parseInt(dimEl.getAttribute("width") || "400", 10)
          : 400;
        const height = dimEl
          ? parseInt(dimEl.getAttribute("height") || "300", 10)
          : 300;
        // Margins
        const mEl = cfg.querySelector("Margins");
        const margin = mEl
          ? {
              top: parseInt(mEl.getAttribute("top") || "40", 10),
              right: parseInt(mEl.getAttribute("right") || "40", 10),
              bottom: parseInt(mEl.getAttribute("bottom") || "60", 10),
              left: parseInt(mEl.getAttribute("left") || "60", 10),
            }
          : { top: 40, right: 40, bottom: 60, left: 60 };
        // Axes labels
        const xEl = cfg.querySelector("XAxis");
        const yEl = cfg.querySelector("YAxis");
        const axes = {
          x: {
            label: xEl?.getAttribute("title") || "",
            scale: "linear",
            gridLines: false,
          },
          y: {
            label: yEl?.getAttribute("title") || "",
            scale: "linear",
            gridLines: false,
          },
        };
        // DataMapping for inline data
        const mappings = Array.from(xmlDoc.querySelectorAll("DataMapping"));
        const dimMap = mappings.find(
          (m) => m.getAttribute("role") === "dimension"
        );
        const measMaps = mappings.filter(
          (m) => m.getAttribute("role") === "measure"
        );
        const categories = dimMap
          ? Array.from(dimMap.querySelectorAll("Mapping")).map(
              (n) => n.textContent || ""
            )
          : [];
        // Build raw data objects
        const rawData = categories.map((cat, i) => {
          const obj: Record<string, any> = { category: cat };
          measMaps.forEach((mm) => {
            const field = mm.getAttribute("field") || "value";
            const vals = Array.from(mm.querySelectorAll("Mapping")).map((n) =>
              parseFloat(n.textContent || "0")
            );
            obj[field] = vals[i] || 0;
          });
          return obj;
        });
        // Build config
        const customConfig = {
          id: chartDef?.getAttribute("id") || "",
          chartType,
          title,
          subtitle: "",
          dimensions: { width, height, responsive: false },
          margin,
          axes,
          fields: measMaps.map((mm) => ({
            name: mm.getAttribute("field") || "",
            role: "y",
            dataType: mm.getAttribute("dataType") || "number",
            title: mm.getAttribute("field") || "",
          })),
          colorScheme:
            xmlDoc.querySelector("ColorScheme")?.textContent || "category10",
          tooltipEnabled:
            xmlDoc.querySelector("Tooltip")?.getAttribute("enabled") !==
            "false",
        };
        // Override with responsive container dims
        customConfig.dimensions = { ...customConfig.dimensions, ...dimensions };
        setConfig(customConfig);
        setChartData(rawData);
      }
      return;
    }
    // Fallback to generic XML parsing
    console.log(
      "D3ChartRenderer: Parsing XML:",
      xmlToUse.substring(0, 200) + "..."
    );
    const parsedConfig = parseChartXML(xmlToUse);
    console.log("D3ChartRenderer: Parsed config:", parsedConfig);
    if (parsedConfig) {
      // Override dimensions with responsive ones
      parsedConfig.dimensions = { ...parsedConfig.dimensions, ...dimensions };
      setConfig(parsedConfig);
      // Use provided data or generate mock data
      const finalData =
        data || generateMockData(parsedConfig.chartType, parsedConfig.fields);
      console.log("D3ChartRenderer: Final data:", finalData);
      setChartData(finalData);
    }
  }, [chartId, chartXml, data, dimensions]);

  if (!config) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center h-64 ${className}`}
      >
        <div className="text-center">
          <div className="text-muted-foreground mb-2">⚠️</div>
          <div className="text-sm text-muted-foreground">
            Invalid chart configuration
          </div>
        </div>
      </div>
    );
  }

  const { width, height } = config.dimensions;

  const renderChart = () => {
    switch (config.chartType) {
      case "bar":
        return <BarChart config={config} data={chartData} svgRef={svgRef} />;
      case "line":
      case "area":
        return <LineChart config={config} data={chartData} svgRef={svgRef} />;
      case "pie":
      case "donut":
        return <PieChart config={config} data={chartData} svgRef={svgRef} />;
      case "scatter":
      case "bubble":
        return <ScatterPlot config={config} data={chartData} svgRef={svgRef} />;
      case "network":
        // NetworkChart expects a different data structure with nodes and links
        const networkData = chartData as any;
        return (
          <NetworkChart config={config} data={networkData} svgRef={svgRef} />
        );
      case "choropleth":
        return (
          <ChoroplethChart config={config} data={chartData} svgRef={svgRef} />
        );
      default:
        return <BarChart config={config} data={chartData} svgRef={svgRef} />;
    }
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ maxWidth: "100%", height: "auto" }}
        className="border border-border rounded"
      />
      {renderChart()}
    </div>
  );
};
