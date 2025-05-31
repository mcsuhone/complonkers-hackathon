import React, { useEffect } from "react";
import * as d3 from "d3";
import type { ChartRendererProps } from "./types";

export const BarChart: React.FC<ChartRendererProps> = ({
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

    // Determine if data is multi-series (grouped bars)
    const keys =
      data.length > 0
        ? Object.keys(data[0]).filter((k) => k !== "category")
        : [];
    if (keys.length <= 1) {
      // Filter out invalid data and ensure numeric values
      const validData = data
        .filter((d) => {
          const value = Number(d.value);
          return !isNaN(value) && isFinite(value) && value >= 0;
        })
        .map((d) => ({
          ...d,
          value: Number(d.value) || 0,
          category: d.category || d.label || "Unknown",
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
        .scaleBand()
        .domain(validData.map((d) => d.category))
        .range([0, innerWidth])
        .padding(0.1);
      const maxValue = d3.max(validData, (d) => d.value) || 0;
      const y = d3
        .scaleLinear()
        .domain([0, maxValue])
        .nice()
        .range([innerHeight, 0]);
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      // Add bars
      g.selectAll(".bar")
        .data(validData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.category) || 0)
        .attr("y", (d) => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", (d) => Math.max(0, innerHeight - y(d.value)))
        .attr("fill", (d, i) => color(i.toString()));
      // Add axes
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y));
    } else {
      // Grouped bar chart for multiple measures
      const categories = data.map((d) => d.category || d.label || "");
      const x0 = d3
        .scaleBand()
        .domain(categories)
        .range([0, innerWidth])
        .padding(0.1);
      const x1 = d3
        .scaleBand()
        .domain(keys)
        .range([0, x0.bandwidth()])
        .padding(0.05);
      // find max across all series
      const maxGroup =
        d3.max(data, (d) => d3.max(keys, (key) => Number(d[key]) || 0)) || 0;
      const y = d3
        .scaleLinear()
        .domain([0, maxGroup])
        .nice()
        .range([innerHeight, 0]);
      const color = d3.scaleOrdinal(d3.schemeCategory10).domain(keys);
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      // groups
      const slice = g
        .selectAll("g.slice")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "slice")
        .attr("transform", (d) => `translate(${x0(d.category)},0)`);
      slice
        .selectAll("rect")
        .data((d) => keys.map((key) => ({ key, value: Number(d[key]) || 0 })))
        .enter()
        .append("rect")
        .attr("x", (d) => x1(d.key) || 0)
        .attr("y", (d) => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", (d) => Math.max(0, innerHeight - y(d.value)))
        .attr("fill", (d) => color(d.key));
      // Add axes
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x0));
      g.append("g").call(d3.axisLeft(y));
    }

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
