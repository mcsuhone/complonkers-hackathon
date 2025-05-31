import React, { useEffect } from "react";
import * as d3 from "d3";
import type { ChartRendererProps } from "./types";

export const ChoroplethChart: React.FC<ChartRendererProps> = ({
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

    // Filter out invalid data and ensure numeric values
    const validData = data
      .filter((d) => {
        const gdp = Number(d.gdp);
        return !isNaN(gdp) && isFinite(gdp) && gdp > 0 && d.country;
      })
      .map((d) => ({
        ...d,
        gdp: Number(d.gdp) || 0,
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

    // Create a simple representation using rectangles for countries
    // This is a simplified choropleth without actual map data
    const maxGdp = d3.max(validData, (d) => d.gdp) || 1;
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxGdp]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Calculate layout for country rectangles
    const cols = Math.ceil(Math.sqrt(validData.length));
    const rows = Math.ceil(validData.length / cols);
    const rectWidth = innerWidth / cols - 4;
    const rectHeight = innerHeight / rows - 4;

    // Add country rectangles
    g.selectAll(".country")
      .data(validData)
      .enter()
      .append("rect")
      .attr("class", "country")
      .attr("x", (d, i) => (i % cols) * (rectWidth + 4))
      .attr("y", (d, i) => Math.floor(i / cols) * (rectHeight + 4))
      .attr("width", Math.max(0, rectWidth))
      .attr("height", Math.max(0, rectHeight))
      .attr("fill", (d) => colorScale(d.gdp))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Add country labels
    g.selectAll(".country-label")
      .data(validData)
      .enter()
      .append("text")
      .attr("class", "country-label")
      .attr("x", (d, i) => (i % cols) * (rectWidth + 4) + rectWidth / 2)
      .attr(
        "y",
        (d, i) => Math.floor(i / cols) * (rectHeight + 4) + rectHeight / 2
      )
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "10px")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .text((d) => d.country.substring(0, 3).toUpperCase());

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

    // Add legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width - legendWidth - 20;
    const legendY = height - 40;

    const legendScale = d3
      .scaleLinear()
      .domain([0, maxGdp])
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format(".2s"));

    // Create gradient for legend
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient
      .selectAll("stop")
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append("stop")
      .attr("offset", (d) => `${d * 100}%`)
      .attr("stop-color", (d) => colorScale(d * maxGdp));

    // Add legend rectangle
    svg
      .append("rect")
      .attr("x", legendX)
      .attr("y", legendY - legendHeight)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .style("stroke", "#ccc");

    // Add legend axis
    svg
      .append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`)
      .call(legendAxis);

    // Add legend title
    svg
      .append("text")
      .attr("x", legendX + legendWidth / 2)
      .attr("y", legendY - legendHeight - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("GDP (Millions USD)");

    // Add tooltip
    if (config.tooltipEnabled) {
      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "d3-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000");

      g.selectAll(".country")
        .on("mouseover", function (event, d: any) {
          tooltip.style("visibility", "visible");
          d3.select(this).attr("stroke-width", 3);
        })
        .on("mousemove", function (event, d: any) {
          const tooltipText = `Country: ${d.country}
GDP: $${d3.format(".2s")(d.gdp)}M
${d.continent ? `Continent: ${d.continent}` : ""}`;

          tooltip
            .style("top", event.pageY - 10 + "px")
            .style("left", event.pageX + 10 + "px")
            .html(tooltipText.replace(/\n/g, "<br>"));
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
          d3.select(this).attr("stroke-width", 1);
        });

      // Clean up tooltip on component unmount
      return () => {
        tooltip.remove();
      };
    }
  }, [config, data]);

  return null;
};
