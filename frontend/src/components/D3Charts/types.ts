export interface ChartConfig {
  id: string;
  chartType: string;
  title: string;
  subtitle: string;
  dimensions: {
    width: number;
    height: number;
    responsive: boolean;
  };
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  axes: {
    x: {
      label: string;
      scale: string;
      gridLines: boolean;
    };
    y: {
      label: string;
      scale: string;
      gridLines: boolean;
    };
  };
  fields: Array<{
    name: string;
    role: string;
    dataType: string;
    title?: string;
    format?: string;
  }>;
  colorScheme: string;
  tooltipEnabled: boolean;
}

export interface ChartRendererProps {
  config: ChartConfig;
  data: any[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export interface NetworkChartRendererProps {
  config: ChartConfig;
  data: {
    nodes: any[];
    links: any[];
  };
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export interface D3ChartRendererProps {
  chartId?: string;
  chartXml?: string;
  data?: any[];
  className?: string;
}
