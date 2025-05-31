import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { getChartDefinition } from "../data/chartRegistry";

interface D3ChartRendererProps {
  chartId: string;
  data?: any[];
  className?: string;
}

// Mock data generators for different chart types
const generateMockData = (chartType: string, fieldMappings: any[]) => {
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
const parseChartXML = (xmlString: string) => {
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

    // Extract chart configuration
    const chartConfig = chartDef.querySelector("ChartConfig");
    const chartType = chartConfig?.getAttribute("type") || "bar";
    const title = chartConfig?.getAttribute("title") || "";
    const subtitle = chartConfig?.getAttribute("subtitle") || "";

    // Extract dimensions
    const dimensions = chartConfig?.querySelector("Dimensions");
    const width = parseInt(dimensions?.getAttribute("width") || "400");
    const height = parseInt(dimensions?.getAttribute("height") || "300");
    const responsive = dimensions?.getAttribute("responsive") !== "false";

    // Extract margins
    const margins = chartConfig?.querySelector("Margins");
    const margin = {
      top: parseInt(margins?.getAttribute("top") || "20"),
      right: parseInt(margins?.getAttribute("right") || "20"),
      bottom: parseInt(margins?.getAttribute("bottom") || "40"),
      left: parseInt(margins?.getAttribute("left") || "40"),
    };

    // Extract axes configuration
    const axes = chartConfig?.querySelector("Axes");
    const xAxis = axes?.querySelector("XAxis");
    const yAxis = axes?.querySelector("YAxis");

    // Extract data mapping
    const dataMapping = chartDef.querySelector("DataMapping");
    const fields = Array.from(dataMapping?.querySelectorAll("Field") || []).map(
      (field) => ({
        name: field.getAttribute("name"),
        role: field.getAttribute("role"),
        dataType: field.getAttribute("dataType") || "string",
        format: field.getAttribute("format"),
      })
    );

    // Extract styling
    const styling = chartDef.querySelector("Styling");
    const colors = styling?.querySelector("Colors");
    const colorScheme = colors?.getAttribute("scheme") || "category10";

    // Extract interactions
    const interactions = chartDef.querySelector("Interactions");
    const tooltip = interactions?.querySelector("Tooltip");
    const tooltipEnabled = tooltip?.getAttribute("enabled") !== "false";

    return {
      id: chartDef.getAttribute("id"),
      chartType,
      title,
      subtitle,
      dimensions: { width, height, responsive },
      margin,
      axes: {
        x: {
          label: xAxis?.getAttribute("label") || "",
          scale: xAxis?.getAttribute("scale") || "linear",
          gridLines: xAxis?.getAttribute("gridLines") === "true",
        },
        y: {
          label: yAxis?.getAttribute("label") || "",
          scale: yAxis?.getAttribute("scale") || "linear",
          gridLines: yAxis?.getAttribute("gridLines") === "true",
        },
      },
      fields,
      colorScheme,
      tooltipEnabled,
    };
  } catch (error) {
    console.error("Error parsing chart XML:", error);
    return null;
  }
};

// Individual chart renderers
const BarChart: React.FC<{
  config: any;
  data: any[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}> = ({ config, data, svgRef }) => {
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = config.dimensions;
    const { margin } = config;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.category || d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
      .nice()
      .range([innerHeight, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.category || d.label) || 0)
      .attr("y", (d) => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerHeight - y(d.value))
      .attr("fill", (d, i) => color(i.toString()));

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    g.append("g").call(d3.axisLeft(y));

    // Add title
    if (config.title) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(config.title);
    }
  }, [config, data]);

  return null;
};

const LineChart: React.FC<{
  config: any;
  data: any[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}> = ({ config, data, svgRef }) => {
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = config.dimensions;
    const { margin } = config;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d, i) => i) as [number, number])
      .range([0, innerWidth]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.value) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    const line = d3
      .line<any>()
      .x((d, i) => x(i))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--primary))")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d, i) => x(i))
      .attr("cy", (d) => y(d.value))
      .attr("r", 4)
      .attr("fill", "hsl(var(--primary))");

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    g.append("g").call(d3.axisLeft(y));

    // Add title
    if (config.title) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(config.title);
    }
  }, [config, data]);

  return null;
};

const PieChart: React.FC<{
  config: any;
  data: any[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}> = ({ config, data, svgRef }) => {
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = config.dimensions;
    const radius = Math.min(width, height) / 2 - 20;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3
      .pie<any>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<any>()
      .innerRadius(config.chartType === "donut" ? radius * 0.4 : 0)
      .outerRadius(radius);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const arcs = g
      .selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i.toString()));

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text((d) => d.data.label);

    // Add title
    if (config.title) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(config.title);
    }
  }, [config, data]);

  return null;
};

const ScatterPlot: React.FC<{
  config: any;
  data: any[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}> = ({ config, data, svgRef }) => {
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = config.dimensions;
    const { margin } = config;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.x) as [number, number])
      .nice()
      .range([0, innerWidth]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.y) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add dots
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", (d) => (config.chartType === "bubble" ? Math.sqrt(d.size) : 4))
      .attr("fill", (d) => color(d.category))
      .attr("opacity", 0.7);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    g.append("g").call(d3.axisLeft(y));

    // Add title
    if (config.title) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(config.title);
    }
  }, [config, data]);

  return null;
};

export const D3ChartRenderer: React.FC<D3ChartRendererProps> = ({
  chartId,
  data,
  className = "",
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const chartXml = getChartDefinition(chartId);
    if (!chartXml) {
      console.error(`Chart definition not found for ID: ${chartId}`);
      return;
    }

    const parsedConfig = parseChartXML(chartXml);
    if (parsedConfig) {
      setConfig(parsedConfig);

      // Use provided data or generate mock data
      const finalData =
        data || generateMockData(parsedConfig.chartType, parsedConfig.fields);
      setChartData(finalData);
    }
  }, [chartId, data]);

  if (!config) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
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
      default:
        return <BarChart config={config} data={chartData} svgRef={svgRef} />;
    }
  };

  return (
    <div className={`w-full ${className}`}>
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

export default D3ChartRenderer;
