import React, { useEffect } from "react";
import * as d3 from "d3";
import type { NetworkChartRendererProps } from "./types";

export const NetworkChart: React.FC<NetworkChartRendererProps> = ({
  config,
  data,
  svgRef,
}) => {
  useEffect(() => {
    if (!svgRef.current || !data.nodes || !data.links) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = config.dimensions;

    const simulation = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d: any) => d.id)
          .distance(80)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25));

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg.append("g");

    // Add links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => Math.sqrt(d.value || 1));

    // Add nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("r", (d: any) => Math.sqrt(d.size || 100) / 2)
      .attr("fill", (d: any) => color(d.group))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add labels
    const label = g
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(data.nodes)
      .enter()
      .append("text")
      .text((d: any) => d.id)
      .style("font-size", "12px")
      .style("text-anchor", "middle")
      .style("fill", "#333")
      .style("pointer-events", "none");

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

      node
        .on("mouseover", function (event, d: any) {
          tooltip.style("visibility", "visible");
          d3.select(this).attr("stroke-width", 4);
        })
        .on("mousemove", function (event, d: any) {
          const tooltipText = `${d.title || d.id}
Group: ${d.group}
${d.size ? `Size: ${d.size}` : ""}`;

          tooltip
            .style("top", event.pageY - 10 + "px")
            .style("left", event.pageX + 10 + "px")
            .html(tooltipText.replace(/\n/g, "<br>"));
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
          d3.select(this).attr("stroke-width", 2);
        });

      // Clean up tooltip on component unmount
      return () => {
        tooltip.remove();
      };
    }

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y + 4);
    });
  }, [config, data]);

  return null;
};
