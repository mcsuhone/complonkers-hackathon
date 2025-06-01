import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

export type BarChartData = {
  label: string;
  value: number;
};

interface BarChartProps {
  data: BarChartData[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 500,
  height = 300,
  margin = { top: 20, right: 30, bottom: 40, left: 40 },
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);
  console.log("data", data);

  useEffect(() => {
    if (!chartContainerRef.current) {
      console.log(
        "BarChart: chartContainerRef.current is null on effect setup."
      );
      return;
    }

    const container = d3.select(chartContainerRef.current);

    // Clear previous SVG to ensure a clean slate on re-renders
    container.select("svg").remove(); // Target the SVG specifically

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("max-width", "100%")
      .style("height", "auto");

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.label) || 0)
      .attr("y", (d) => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - margin.bottom - yScale(d.value))
      .attr("fill", "steelblue");

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));

    // Cleanup function to remove the specific SVG element
    return () => {
      console.log(
        "BarChart: Cleanup - chartContainerRef.current:",
        chartContainerRef.current
      );
      if (chartContainerRef.current) {
        d3.select(chartContainerRef.current).select("svg").remove(); // Target the SVG specifically for removal
      }
    };
  }, [data, width, height, margin]);

  return (
    <div>
      <h2>D3 Bar Chart</h2>
      <div ref={chartContainerRef}></div>
    </div>
  );
};
