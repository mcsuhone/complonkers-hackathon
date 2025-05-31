import React, { useState } from "react";
import { SlideRenderer } from "./SlideRenderer";
import { slideLayouts, getLayoutByType } from "../data/slideLayouts";
import { chartMetadata, getAvailableChartIds } from "../data/chartRegistry";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";

export const SlideLayoutDemo: React.FC = () => {
  const [currentLayout, setCurrentLayout] = useState<string>("title");
  const [currentContent, setCurrentContent] = useState<string>(
    "AI-Powered Business Presentations"
  );

  const layoutTypes = [
    {
      key: "title",
      name: "Title Slide",
      description: "Opening slide with title and subtitle",
    },
    {
      key: "content",
      name: "Content Slide",
      description: "Text content with image placeholder",
    },
    {
      key: "chart",
      name: "Chart Slide",
      description: "Bubble chart showing company performance",
    },
    {
      key: "network",
      name: "Network Slide",
      description: "Interactive organization network",
    },
    {
      key: "financial",
      name: "Financial Slide",
      description: "Stock price candlestick chart",
    },
    {
      key: "geographic",
      name: "Geographic Slide",
      description: "World GDP choropleth map",
    },
    {
      key: "hierarchy",
      name: "Hierarchy Slide",
      description: "Technology companies treemap",
    },
    {
      key: "correlation",
      name: "Correlation Slide",
      description: "Business metrics heatmap",
    },
  ];

  const handleLayoutChange = (layoutKey: string) => {
    setCurrentLayout(layoutKey);

    // Set appropriate content for each layout type
    switch (layoutKey) {
      case "title":
        setCurrentContent("AI-Powered Business Presentations");
        break;
      case "content":
        setCurrentContent("Transform your data into compelling visual stories");
        break;
      case "chart":
        setCurrentContent("Company Performance Analysis");
        break;
      case "network":
        setCurrentContent("Organization Structure Visualization");
        break;
      case "financial":
        setCurrentContent("Stock Market Analysis");
        break;
      case "geographic":
        setCurrentContent("Global Economic Overview");
        break;
      case "hierarchy":
        setCurrentContent("Technology Market Segmentation");
        break;
      case "correlation":
        setCurrentContent("Business Metrics Relationships");
        break;
      default:
        setCurrentContent("Sample Content");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Slide Layout Demo</h1>
        <p className="text-muted-foreground">
          Showcasing XML-driven slide layouts with chart ID references
        </p>
      </div>

      {/* Layout Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Available Slide Layouts</CardTitle>
          <CardDescription>
            Each layout uses XML schema with chart ID references for clean
            separation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {layoutTypes.map((layout) => (
              <Button
                key={layout.key}
                variant={currentLayout === layout.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleLayoutChange(layout.key)}
                className="h-auto p-3 flex flex-col items-start text-left"
              >
                <div className="font-medium">{layout.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {layout.description}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart Registry Info */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Registry</CardTitle>
          <CardDescription>
            Available chart definitions that can be referenced by ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {chartMetadata.map((chart) => (
              <div key={chart.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {chart.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {chart.category}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium text-sm">{chart.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {chart.description}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    ID: {chart.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Slide Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Slide Preview</CardTitle>
          <CardDescription>
            Current layout:{" "}
            {layoutTypes.find((l) => l.key === currentLayout)?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-white">
            <SlideRenderer
              layoutXml={getLayoutByType(currentLayout as any)}
              content={currentContent}
              isPresentation={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Technical implementation details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. XML Schema Separation</h4>
            <p className="text-sm text-muted-foreground">
              Slide layouts use{" "}
              <code className="bg-muted px-1 rounded">slide_layout.xsd</code>{" "}
              with
              <code className="bg-muted px-1 rounded ml-1">chartId</code>{" "}
              attributes instead of embedded XML.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">2. Chart Registry</h4>
            <p className="text-sm text-muted-foreground">
              Chart definitions follow{" "}
              <code className="bg-muted px-1 rounded">
                chart_definition.xsd
              </code>{" "}
              and are stored in a registry accessible by ID.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">3. Runtime Resolution</h4>
            <p className="text-sm text-muted-foreground">
              The <code className="bg-muted px-1 rounded">D3ChartRenderer</code>{" "}
              fetches chart definitions from the registry using the provided ID
              and renders interactive D3.js visualizations.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">4. AI Agent Benefits</h4>
            <p className="text-sm text-muted-foreground">
              AI agents can generate clean slide layouts with chart references,
              while chart definitions remain reusable and maintainable in the
              registry.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
