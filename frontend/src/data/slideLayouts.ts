// Hardcoded XML layouts that adhere to slide_layout.xsd
export const slideLayouts = {
  titleSlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="title-slide" classes="flex flex-col items-center justify-center h-full bg-gradient-to-br from-primary/10 to-secondary/10">
    <Text tag="h1" classes="text-4xl font-bold text-center mb-4" placeholder="Presentation Title"/>
    <Text tag="p" classes="text-xl text-muted-foreground text-center max-w-2xl" placeholder="Subtitle or brief description"/>
  </Slide>
</SlideDeck>`,

  contentSlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="content-slide" classes="p-8">
    <Container classes="max-w-4xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold mb-6" placeholder="Section Title"/>
      <Container classes="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Container classes="space-y-4">
          <Text tag="p" classes="text-lg leading-relaxed" placeholder="Main content paragraph"/>
          <List ordered="false" classes="space-y-2 text-base" placeholder="Key points list"/>
        </Container>
        <Container classes="flex items-center justify-center">
          <Image classes="rounded-lg shadow-lg max-w-full h-auto" placeholder="Supporting image" alt="Content illustration"/>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,

  chartSlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="chart-slide" classes="p-8">
    <Container classes="max-w-6xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-8" placeholder="Data Insights"/>
      <Container classes="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Container classes="lg:col-span-2">
          <Chart type="bubble" classes="w-full h-96 bg-card rounded-lg p-4" placeholder="Main chart visualization" chartId="company-performance-bubble"/>
        </Container>
        <Container classes="space-y-6">
          <Text tag="h3" classes="text-xl font-semibold" placeholder="Key Findings"/>
          <List ordered="true" classes="space-y-3 text-base" placeholder="Data insights list"/>
          <Container classes="bg-muted/30 p-4 rounded-lg">
            <Text tag="p" classes="text-sm text-muted-foreground" placeholder="Additional context or methodology"/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,

  networkSlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="network-slide" classes="p-8 bg-slate-50">
    <Container classes="max-w-6xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2" placeholder="Organization Structure"/>
      <Text tag="p" classes="text-lg text-muted-foreground text-center mb-8" placeholder="Interactive network visualization"/>
      <Container classes="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <Container classes="xl:col-span-3">
          <Chart type="network" classes="w-full h-[500px] bg-white rounded-lg shadow-sm border" placeholder="Organization network" chartId="organization-network"/>
        </Container>
        <Container classes="space-y-6">
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Network Metrics"/>
            <List ordered="false" classes="space-y-2 text-sm" placeholder="• Total nodes: 20\n• Connections: 19\n• Avg degree: 1.9\n• Clusters: 5"/>
          </Container>
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Interaction Guide"/>
            <List ordered="false" classes="space-y-2 text-sm text-muted-foreground" placeholder="• Drag nodes to reposition\n• Hover for details\n• Click to select\n• Zoom with mouse wheel"/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,

  financialSlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="financial-slide" classes="p-8 bg-gradient-to-br from-green-50 to-blue-50">
    <Container classes="max-w-6xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2" placeholder="Financial Performance"/>
      <Text tag="p" classes="text-lg text-muted-foreground text-center mb-8" placeholder="Stock price analysis with interactive controls"/>
      <Container classes="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <Container classes="lg:col-span-4">
          <Chart type="candlestick" classes="w-full h-96 bg-white rounded-lg shadow-sm border p-4" placeholder="Stock candlestick chart" chartId="stock-price-candlestick"/>
        </Container>
        <Container classes="space-y-4">
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-2 text-green-700" placeholder="Current Price"/>
            <Text tag="p" classes="text-2xl font-bold text-green-600" placeholder="$168.50"/>
            <Text tag="p" classes="text-sm text-green-500" placeholder="+2.3% today"/>
          </Container>
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Key Stats"/>
            <List ordered="false" classes="space-y-2 text-sm" placeholder="• Volume: 2.7M\n• 52W High: $169.30\n• 52W Low: $148.90\n• Market Cap: $2.8T"/>
          </Container>
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Analysis"/>
            <Text tag="p" classes="text-sm text-muted-foreground" placeholder="Strong upward trend with consistent volume. Technical indicators suggest continued growth potential."/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,

  geographicSlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="geographic-slide" classes="p-8 bg-slate-900 text-white">
    <Container classes="max-w-6xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2 text-white" placeholder="Global Market Analysis"/>
      <Text tag="p" classes="text-lg text-slate-300 text-center mb-8" placeholder="Interactive world map with economic data"/>
      <Container classes="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <Container classes="xl:col-span-3">
          <Chart type="choropleth" classes="w-full h-[500px] bg-slate-800 rounded-lg border border-slate-700" placeholder="World GDP choropleth map" chartId="world-gdp-choropleth"/>
        </Container>
        <Container classes="space-y-6">
          <Container classes="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <Text tag="h3" classes="text-lg font-semibold mb-3 text-white" placeholder="Top Economies"/>
            <List ordered="true" classes="space-y-2 text-sm text-slate-300" placeholder="1. United States - $25.5T\n2. China - $17.7T\n3. Japan - $4.9T\n4. Germany - $4.3T\n5. India - $3.7T"/>
          </Container>
          <Container classes="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <Text tag="h3" classes="text-lg font-semibold mb-3 text-white" placeholder="Regional Insights"/>
            <Text tag="p" classes="text-sm text-slate-300" placeholder="North America and Asia dominate global GDP, representing over 60% of world economic output. Emerging markets show strong growth potential."/>
          </Container>
          <Container classes="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <Text tag="h3" classes="text-lg font-semibold mb-3 text-white" placeholder="Map Controls"/>
            <List ordered="false" classes="space-y-2 text-sm text-slate-400" placeholder="• Zoom: Mouse wheel\n• Pan: Click and drag\n• Details: Hover over countries\n• Reset: Double-click"/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,

  hierarchySlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="hierarchy-slide" classes="p-8 bg-gradient-to-br from-purple-50 to-pink-50">
    <Container classes="max-w-6xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2" placeholder="Market Segmentation"/>
      <Text tag="p" classes="text-lg text-muted-foreground text-center mb-8" placeholder="Technology sector breakdown by market capitalization"/>
      <Container classes="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Container classes="lg:col-span-2">
          <Chart type="treemap" classes="w-full h-[500px] bg-white rounded-lg shadow-sm border" placeholder="Technology companies treemap" chartId="tech-companies-treemap"/>
        </Container>
        <Container classes="space-y-6">
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3 text-purple-700" placeholder="Sector Overview"/>
            <List ordered="false" classes="space-y-2 text-sm" placeholder="• Software: 35% share\n• Hardware: 45% share\n• Cloud: 15% share\n• Social: 5% share"/>
          </Container>
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Market Leaders"/>
            <List ordered="true" classes="space-y-2 text-sm" placeholder="1. Apple - $3.94T\n2. Microsoft - $2.8T\n3. Alphabet - $1.8T\n4. Amazon - $1.5T\n5. Meta - $1.18T"/>
          </Container>
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Insights"/>
            <Text tag="p" classes="text-sm text-muted-foreground" placeholder="Hardware companies dominate by market cap, but software shows higher growth rates. Cloud services represent the fastest-growing segment."/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,

  correlationSlide: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="correlation-slide" classes="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
    <Container classes="max-w-5xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2" placeholder="Business Metrics Analysis"/>
      <Text tag="p" classes="text-lg text-muted-foreground text-center mb-8" placeholder="Understanding relationships between key performance indicators"/>
      <Container classes="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Container>
          <Chart type="heatmap" classes="w-full h-96 bg-white rounded-lg shadow-sm border p-4" placeholder="Correlation heatmap" chartId="business-metrics-heatmap"/>
        </Container>
        <Container classes="space-y-6">
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3 text-blue-700" placeholder="Strong Correlations"/>
            <List ordered="false" classes="space-y-2 text-sm" placeholder="• Revenue ↔ Market Share (0.91)\n• Marketing ↔ Brand Awareness (0.88)\n• Revenue ↔ Marketing Spend (0.85)\n• Customer Satisfaction ↔ Quality (0.82)"/>
          </Container>
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Key Insights"/>
            <Text tag="p" classes="text-sm text-muted-foreground" placeholder="Market share shows the strongest correlation with revenue, suggesting that competitive positioning is crucial for financial success. Marketing investments effectively drive brand awareness."/>
          </Container>
          <Container classes="bg-white p-4 rounded-lg shadow-sm border">
            <Text tag="h3" classes="text-lg font-semibold mb-3" placeholder="Recommendations"/>
            <List ordered="true" classes="space-y-2 text-sm" placeholder="1. Focus on market share growth\n2. Increase marketing for brand building\n3. Maintain product quality standards\n4. Monitor customer satisfaction closely"/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,
};

export const getRandomLayout = (): string => {
  const layouts = Object.values(slideLayouts);
  return layouts[Math.floor(Math.random() * layouts.length)];
};

export const getLayoutByType = (
  type:
    | "title"
    | "content"
    | "chart"
    | "network"
    | "financial"
    | "geographic"
    | "hierarchy"
    | "correlation"
): string => {
  switch (type) {
    case "title":
      return slideLayouts.titleSlide;
    case "content":
      return slideLayouts.contentSlide;
    case "chart":
      return slideLayouts.chartSlide;
    case "network":
      return slideLayouts.networkSlide;
    case "financial":
      return slideLayouts.financialSlide;
    case "geographic":
      return slideLayouts.geographicSlide;
    case "hierarchy":
      return slideLayouts.hierarchySlide;
    case "correlation":
      return slideLayouts.correlationSlide;
    default:
      return slideLayouts.contentSlide;
  }
};
