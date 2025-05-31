import React, { useEffect } from "react";
import * as d3 from "d3";
import type { ChartRendererProps } from "./types";

export const LineChart: React.FC<ChartRendererProps> = ({
  config,
  data,
  svgRef,
}) => {
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = config.dimensions;
    const { margin } = config;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Filter out invalid data and ensure numeric values
    const validData = data
      .filter((d) => {
        const value = Number(d.value);
        return !isNaN(value) && isFinite(value);
      })
      .map((d) => ({
        ...d,
        value: Number(d.value) || 0,
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

    const x = d3
      .scaleLinear()
      .domain(d3.extent(validData, (d, i) => i) as [number, number])
      .range([0, innerWidth]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(validData, (d) => d.value) as [number, number])
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
      .datum(validData)
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--primary))")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots
    g.selectAll(".dot")
      .data(validData)
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
