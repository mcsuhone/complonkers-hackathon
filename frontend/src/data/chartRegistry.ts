// Chart Registry - Stores chart definitions by ID for reference from slide layouts
// This implements the pattern where slide layouts reference charts by ID rather than embedding XML

import { chartExamples } from "./chartExamples";

// Chart registry interface
export interface ChartRegistry {
  [chartId: string]: string; // chartId -> chart definition XML
}

// Main chart registry with all available chart definitions
export const chartRegistry: ChartRegistry = {
  // Business Performance Charts
  "company-performance-bubble": chartExamples.bubbleChartXml,
  "stock-price-candlestick": chartExamples.candlestickChartXml,
  "business-metrics-heatmap": chartExamples.heatmapChartXml,

  // Organizational Charts
  "organization-network": chartExamples.networkChartXml,
  "skills-assessment-radar": chartExamples.radarChartXml,

  // Market Analysis Charts
  "tech-companies-treemap": chartExamples.treemapChartXml,
  "world-gdp-choropleth": chartExamples.choroplethMapXml,
  "music-trends-streamgraph": chartExamples.streamgraphChartXml,

  // Flow and Process Charts
  "energy-flow-sankey": chartExamples.sankeyChartXml,
};

// Utility function to get chart definition by ID
export const getChartDefinition = (chartId: string): string | null => {
  return chartRegistry[chartId] || null;
};

// Utility function to get all available chart IDs
export const getAvailableChartIds = (): string[] => {
  return Object.keys(chartRegistry);
};

// Utility function to check if a chart ID exists
export const chartExists = (chartId: string): boolean => {
  return chartId in chartRegistry;
};

// Chart metadata for UI purposes
export interface ChartMetadata {
  id: string;
  name: string;
  description: string;
  category: "business" | "organizational" | "market" | "flow";
  type: string;
}

export const chartMetadata: ChartMetadata[] = [
  {
    id: "company-performance-bubble",
    name: "Company Performance Analysis",
    description: "Revenue vs Profit with Employee Count",
    category: "business",
    type: "bubble",
  },
  {
    id: "stock-price-candlestick",
    name: "Stock Price Movement",
    description: "OHLC financial data with interactive controls",
    category: "business",
    type: "candlestick",
  },
  {
    id: "business-metrics-heatmap",
    name: "Business Metrics Correlation",
    description: "Correlation matrix visualization",
    category: "business",
    type: "heatmap",
  },
  {
    id: "organization-network",
    name: "Organization Network",
    description: "Interactive organizational structure",
    category: "organizational",
    type: "network",
  },
  {
    id: "skills-assessment-radar",
    name: "Skills Assessment",
    description: "Multi-dimensional developer skills comparison",
    category: "organizational",
    type: "radar",
  },
  {
    id: "tech-companies-treemap",
    name: "Technology Companies",
    description: "Market cap hierarchical visualization",
    category: "market",
    type: "treemap",
  },
  {
    id: "world-gdp-choropleth",
    name: "World GDP Map",
    description: "Global economic data visualization",
    category: "market",
    type: "choropleth",
  },
  {
    id: "music-trends-streamgraph",
    name: "Music Genre Trends",
    description: "Popularity over time with flowing curves",
    category: "market",
    type: "streamgraph",
  },
  {
    id: "energy-flow-sankey",
    name: "Energy Flow Diagram",
    description: "From sources to consumption",
    category: "flow",
    type: "sankey",
  },
];

// Utility function to get chart metadata by ID
export const getChartMetadata = (chartId: string): ChartMetadata | null => {
  return chartMetadata.find((meta) => meta.id === chartId) || null;
};
