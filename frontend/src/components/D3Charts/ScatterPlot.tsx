import React, { useEffect } from "react";
import * as d3 from "d3";
import type { ChartRendererProps } from "./types";

export const ScatterPlot: React.FC<ChartRendererProps> = ({
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

    // Get field mappings from config
    const xField = config.fields.find((f: any) => f.role === "x");
    const yField = config.fields.find((f: any) => f.role === "y");
    const sizeField = config.fields.find((f: any) => f.role === "size");
    const colorField = config.fields.find((f: any) => f.role === "color");

    // Use field names or fallback to default properties
    const xProp = xField?.name || "x";
    const yProp = yField?.name || "y";
    const sizeProp = sizeField?.name || "size";
    const colorProp = colorField?.name || "category";

    // Filter out invalid data and ensure numeric values
    const validData = data
      .filter((d) => {
        const xValue = Number(d[xProp]);
        const yValue = Number(d[yProp]);
        const sizeValue = sizeField ? Number(d[sizeProp]) : 1;

        return (
          !isNaN(xValue) &&
          isFinite(xValue) &&
          !isNaN(yValue) &&
          isFinite(yValue) &&
          (!sizeField ||
            (!isNaN(sizeValue) && isFinite(sizeValue) && sizeValue > 0))
        );
      })
      .map((d) => ({
        ...d,
        [xProp]: Number(d[xProp]) || 0,
        [yProp]: Number(d[yProp]) || 0,
        [sizeProp]: sizeField ? Number(d[sizeProp]) || 1 : 1,
        [colorProp]: d[colorProp] || "Unknown",
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
      .domain(d3.extent(validData, (d) => d[xProp]) as [number, number])
      .nice()
      .range([0, innerWidth]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(validData, (d) => d[yProp]) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    // Size scale for bubble charts
    const sizeScale = sizeField
      ? d3
          .scaleSqrt()
          .domain(d3.extent(validData, (d) => d[sizeProp]) as [number, number])
          .range([4, 30])
      : () => 6;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add dots/bubbles
    g.selectAll(".dot")
      .data(validData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d[xProp]))
      .attr("cy", (d) => y(d[yProp]))
      .attr("r", (d) => (sizeField ? sizeScale(d[sizeProp]) : 6))
      .attr("fill", (d) => color(d[colorProp]))
      .attr("opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text(xField?.title || xProp);

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -innerHeight / 2)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text(yField?.title || yProp);

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

      g.selectAll(".dot")
        .on("mouseover", function (event, d: any) {
          tooltip.style("visibility", "visible");
          d3.select(this).attr("opacity", 1);
        })
        .on("mousemove", function (event, d: any) {
          const tooltipText = `${d.company || d.name || "Item"}
${xField?.title || xProp}: ${d[xProp]}
${yField?.title || yProp}: ${d[yProp]}
${sizeField ? `${sizeField.title || sizeProp}: ${d[sizeProp]}` : ""}
${colorField ? `${colorField.title || colorProp}: ${d[colorProp]}` : ""}`;

          tooltip
            .style("top", event.pageY - 10 + "px")
            .style("left", event.pageX + 10 + "px")
            .html(tooltipText.replace(/\n/g, "<br>"));
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
          d3.select(this).attr("opacity", 0.7);
        });

      // Clean up tooltip on component unmount
      return () => {
        tooltip.remove();
      };
    }
  }, [config, data]);

  return null;
};
