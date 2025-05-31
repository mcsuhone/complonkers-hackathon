# D3Charts Components

This folder contains modular D3.js chart components for the presentation system.

## Structure

- **`D3ChartRenderer.tsx`** - Main orchestrator component that renders different chart types
- **`types.ts`** - TypeScript interfaces and types shared across all chart components
- **`utils.ts`** - Utility functions for data generation and XML parsing
- **`index.ts`** - Barrel export file for clean imports

## Individual Chart Components

- **`BarChart.tsx`** - Bar chart visualization
- **`LineChart.tsx`** - Line and area chart visualization
- **`PieChart.tsx`** - Pie and donut chart visualization
- **`ScatterPlot.tsx`** - Scatter plot and bubble chart visualization
- **`NetworkChart.tsx`** - Force-directed network graph visualization

## Usage

```tsx
import { D3ChartRenderer } from '@/components/D3Charts';

// Use with chart XML from database
<D3ChartRenderer
  chartXml={chartXmlFromDatabase}
  data={chartData}
  className="w-full h-96"
/>

// Or use with chart ID (backwards compatibility)
<D3ChartRenderer
  chartId="company-performance-bubble"
  data={chartData}
  className="w-full h-96"
/>
```

## Features

- **Responsive Design**: Charts automatically resize to fit their containers
- **Interactive Tooltips**: Hover effects with detailed data information
- **Field Mapping**: Supports dynamic field mapping from chart XML configuration
- **Multiple Chart Types**: Bar, line, pie, scatter/bubble, and network charts
- **Database Integration**: Works with chart definitions stored in IndexedDB
- **Backwards Compatibility**: Still supports the old chart registry system

## Adding New Chart Types

1. Create a new component file (e.g., `HeatmapChart.tsx`)
2. Implement the `ChartRendererProps` interface
3. Add the component to the switch statement in `D3ChartRenderer.tsx`
4. Export the component in `index.ts`
