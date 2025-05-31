import React, { useEffect } from "react";
import * as d3 from "d3";
import type { ChartRendererProps } from "./types";

export const PieChart: React.FC<ChartRendererProps> = ({
  config,
  data,
  svgRef,
}) => {
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = config.dimensions;
    const radius = Math.min(width, height) / 2 - 20;

    // Filter out invalid data and ensure numeric values
    const validData = data
      .filter((d) => {
        const value = Number(d.value);
        return !isNaN(value) && isFinite(value) && value > 0;
      })
      .map((d) => ({
        ...d,
        value: Number(d.value) || 0,
        label: d.label || d.category || "Unknown",
      }));

    if (validData.length === 0) {
      // Show "No data" message
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("No valid data to display");
      return;
    }

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
      .data(pie(validData))
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
