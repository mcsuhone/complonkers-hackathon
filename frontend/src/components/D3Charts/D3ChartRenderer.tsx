import React, { useRef, useEffect, useState } from "react";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { PieChart } from "./PieChart";
import { ScatterPlot } from "./ScatterPlot";
import { NetworkChart } from "./NetworkChart";
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
  const [chartData, setChartData] = useState<any[]>([]);
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

    const parsedConfig = parseChartXML(xmlToUse);
    if (parsedConfig) {
      // Override dimensions with responsive ones
      parsedConfig.dimensions = { ...parsedConfig.dimensions, ...dimensions };
      setConfig(parsedConfig);

      // Use provided data or generate mock data
      const finalData =
        data || generateMockData(parsedConfig.chartType, parsedConfig.fields);
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
