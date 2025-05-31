import type { Layout, Chart, TextComponent } from "@/db";

// Hardcoded presentation template data
// This will be seeded into the database when creating a presentation

// Layout definitions with textId references
export const templateLayouts: Layout[] = [
  {
    id: "title-layout",
    name: "Title Slide Layout",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="title-slide" classes="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100">
    <Text tag="h1" classes="text-5xl font-bold text-center mb-6 text-blue-900" textId="title-main" placeholder="AI-Powered Data Visualization"/>
    <Text tag="p" classes="text-xl text-blue-700 text-center max-w-3xl mb-8" textId="title-subtitle" placeholder="Transforming Business Intelligence Through Interactive Charts"/>
    <Container classes="flex items-center space-x-4 text-blue-600">
      <Text tag="p" classes="text-sm" textId="title-feature-1" placeholder="📊 Company Performance"/>
      <Text tag="p" classes="text-sm" textId="title-feature-2" placeholder="🌐 Network Analysis"/>
      <Text tag="p" classes="text-sm" textId="title-feature-3" placeholder="🗺️ Geographic Insights"/>
    </Container>
  </Slide>
</SlideDeck>`,
    createdAt: new Date(),
  },
  {
    id: "company-performance-layout",
    name: "Company Performance Layout",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="performance-slide" classes="p-8 bg-gradient-to-br from-green-50 to-emerald-50">
    <Container classes="max-w-7xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2 text-green-800" textId="performance-title" placeholder="Company Performance Analysis"/>
      <Text tag="p" classes="text-lg text-green-600 text-center mb-8" textId="performance-subtitle" placeholder="Revenue vs Profit with Employee Count Visualization"/>
      <Container classes="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <Container classes="xl:col-span-3">
          <Chart type="bubble" classes="w-full h-[500px] bg-white rounded-xl shadow-lg border border-green-200 p-6" placeholder="Company performance bubble chart" chartId="company-performance-bubble"/>
        </Container>
        <Container classes="space-y-6">
          <Container classes="bg-white p-6 rounded-xl shadow-lg border border-green-200">
            <Text tag="h3" classes="text-lg font-semibold mb-4 text-green-700" textId="performance-insights-title" placeholder="Key Insights"/>
            <List ordered="false" classes="space-y-3 text-sm text-green-600" placeholder="• Apple leads in revenue\n• NVIDIA shows highest profit margin\n• Tech sector dominates performance\n• Employee count varies significantly"/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,
    createdAt: new Date(),
  },
  {
    id: "network-analysis-layout",
    name: "Network Analysis Layout",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="network-slide" classes="p-8 bg-gradient-to-br from-purple-50 to-violet-50">
    <Container classes="max-w-7xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2 text-purple-800" textId="network-title" placeholder="Organization Network Analysis"/>
      <Text tag="p" classes="text-lg text-purple-600 text-center mb-8" textId="network-subtitle" placeholder="Interactive Force-Directed Organizational Structure"/>
      <Container classes="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <Container classes="xl:col-span-3">
          <Chart type="network" classes="w-full h-[500px] bg-white rounded-xl shadow-lg border border-purple-200" placeholder="Organization network visualization" chartId="organization-network"/>
        </Container>
        <Container classes="xl:col-span-2 space-y-6">
          <Container classes="bg-white p-6 rounded-xl shadow-lg border border-purple-200">
            <Text tag="h3" classes="text-lg font-semibold mb-4 text-purple-700" textId="network-metrics-title" placeholder="Network Metrics"/>
          </Container>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,
    createdAt: new Date(),
  },
  {
    id: "global-market-layout",
    name: "Global Market Layout",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="global-slide" classes="p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
    <Container classes="max-w-7xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-2 text-white" textId="global-title" placeholder="Global Market Analysis"/>
      <Text tag="p" classes="text-lg text-slate-300 text-center mb-8" textId="global-subtitle" placeholder="World GDP Distribution with Interactive Choropleth Mapping"/>
      <Container classes="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <Container classes="xl:col-span-3">
          <Chart type="choropleth" classes="w-full h-[500px] bg-slate-700 rounded-xl shadow-2xl border border-slate-600" placeholder="World GDP choropleth map" chartId="world-gdp-choropleth"/>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,
    createdAt: new Date(),
  },
  {
    id: "summary-layout",
    name: "Summary Layout",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<SlideDeck xmlns="http://www.complonkers-hackathon/slide_layout">
  <Slide id="summary-slide" classes="p-8 bg-gradient-to-br from-orange-50 to-amber-50">
    <Container classes="max-w-6xl mx-auto">
      <Text tag="h2" classes="text-3xl font-bold text-center mb-8 text-orange-800" textId="summary-title" placeholder="Key Takeaways &amp; Next Steps"/>
      <Container classes="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Container classes="bg-white p-6 rounded-xl shadow-lg border border-orange-200 text-center">
          <Text tag="h3" classes="text-xl font-semibold mb-4 text-green-700" textId="summary-performance-title" placeholder="📊 Performance Insights"/>
          <Text tag="p" classes="text-sm text-green-600 mb-4" textId="summary-performance-desc" placeholder="Bubble charts reveal complex relationships between revenue, profit, and scale across technology companies."/>
        </Container>
        <Container classes="bg-white p-6 rounded-xl shadow-lg border border-orange-200 text-center">
          <Text tag="h3" classes="text-xl font-semibold mb-4 text-purple-700" textId="summary-network-title" placeholder="🌐 Network Analysis"/>
          <Text tag="p" classes="text-sm text-purple-600 mb-4" textId="summary-network-desc" placeholder="Force-directed graphs provide intuitive visualization of organizational structures and relationships."/>
        </Container>
        <Container classes="bg-white p-6 rounded-xl shadow-lg border border-orange-200 text-center">
          <Text tag="h3" classes="text-xl font-semibold mb-4 text-slate-700" textId="summary-geographic-title" placeholder="🗺️ Geographic Intelligence"/>
          <Text tag="p" classes="text-sm text-slate-600 mb-4" textId="summary-geographic-desc" placeholder="Choropleth maps enable spatial analysis of global economic data with interactive exploration."/>
        </Container>
      </Container>
    </Container>
  </Slide>
</SlideDeck>`,
    createdAt: new Date(),
  },
];

// Chart definitions (only schema, no embedded data)
export const templateCharts: Chart[] = [
  {
    id: "company-performance-bubble",
    name: "Company Performance Bubble Chart",
    type: "bubble",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<ChartDefinition xmlns="http://www.complonkers-hackathon/chart_definition">
  <Chart id="company-performance-bubble" type="bubble">
    <Title>Technology Company Performance Analysis</Title>
    <Description>Multi-dimensional analysis of revenue, profit, and employee count across major technology companies</Description>
    <DataSource type="external" dataId="company-performance-data"/>
    <Encoding>
      <X field="revenue" type="quantitative" title="Revenue (Millions USD)"/>
      <Y field="profit" type="quantitative" title="Profit (Millions USD)"/>
      <Size field="employees" type="quantitative" title="Employee Count"/>
      <Color field="sector" type="nominal" title="Sector"/>
    </Encoding>
    <Styling>
      <ColorScheme>category10</ColorScheme>
      <Opacity>0.7</Opacity>
      <SizeRange min="100" max="2000"/>
    </Styling>
    <Interactions>
      <Tooltip enabled="true" format="Company: {company}\\nRevenue: {revenue}M\\nProfit: {profit}M\\nEmployees: {employees}"/>
      <Zoom enabled="true"/>
      <Pan enabled="true"/>
      <Brush enabled="true"/>
    </Interactions>
  </Chart>
</ChartDefinition>`,
    createdAt: new Date(),
  },
  {
    id: "organization-network",
    name: "Organization Network Visualization",
    type: "network",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<ChartDefinition xmlns="http://www.complonkers-hackathon/chart_definition">
  <Chart id="organization-network" type="network">
    <Title>Organizational Structure Network</Title>
    <Description>Force-directed network visualization of company hierarchy and reporting relationships</Description>
    <DataSource type="external" dataId="organization-network-data"/>
    <ForceSimulation>
      <CenterForce strength="0.1"/>
      <ChargeForce strength="-300"/>
      <LinkForce distance="50"/>
      <CollisionForce radius="20"/>
    </ForceSimulation>
    <Styling>
      <ColorScheme>category10</ColorScheme>
      <NodeStroke>#fff</NodeStroke>
      <NodeStrokeWidth>2</NodeStrokeWidth>
      <LinkStroke>#999</LinkStroke>
      <LinkOpacity>0.6</LinkOpacity>
    </Styling>
    <Interactions>
      <Drag enabled="true"/>
      <Tooltip enabled="true" format="Role: {title}\\nLevel: {group}"/>
      <Zoom enabled="true"/>
    </Interactions>
  </Chart>
</ChartDefinition>`,
    createdAt: new Date(),
  },
  {
    id: "world-gdp-choropleth",
    name: "World GDP Choropleth Map",
    type: "choropleth",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<ChartDefinition xmlns="http://www.complonkers-hackathon/chart_definition">
  <Chart id="world-gdp-choropleth" type="choropleth">
    <Title>Global GDP Distribution</Title>
    <Description>World map showing GDP distribution across countries with interactive exploration</Description>
    <DataSource type="external" dataId="world-gdp-data"/>
    <Projection type="naturalEarth1"/>
    <Encoding>
      <Fill field="gdp" type="quantitative" title="GDP (Millions USD)"/>
    </Encoding>
    <Styling>
      <ColorScheme>blues</ColorScheme>
      <Stroke>#fff</Stroke>
      <StrokeWidth>0.5</StrokeWidth>
      <NoDataColor>#f0f0f0</NoDataColor>
    </Styling>
    <Interactions>
      <Tooltip enabled="true" format="Country: {country}\\nGDP: {gdp}M\\nContinent: {continent}"/>
      <Zoom enabled="true"/>
      <Pan enabled="true"/>
    </Interactions>
  </Chart>
</ChartDefinition>`,
    createdAt: new Date(),
  },
];

// Text component definitions
export const templateTextComponents: TextComponent[] = [
  {
    id: "title-main",
    name: "Main Title",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<TextComponent xmlns="http://www.complonkers-hackathon/text_component" id="title-main" name="Main Title">
  <Content type="static" editable="true">
    <Text>AI-Powered Data Visualization</Text>
    <PlaceholderText>Enter your presentation title</PlaceholderText>
  </Content>
  <Styling>
    <TailwindClasses>text-5xl font-bold text-center mb-6 text-blue-900</TailwindClasses>
    <Typography fontSize="5xl" fontWeight="bold" textAlign="center"/>
    <Colors textColor="text-blue-900"/>
  </Styling>
  <Metadata createdAt="2024-01-01T00:00:00.000Z" category="title">
    <Description>Main presentation title</Description>
    <Tags>
      <Tag>title</Tag>
      <Tag>heading</Tag>
    </Tags>
  </Metadata>
</TextComponent>`,
    createdAt: new Date(),
  },
  {
    id: "title-subtitle",
    name: "Title Subtitle",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<TextComponent xmlns="http://www.complonkers-hackathon/text_component" id="title-subtitle" name="Title Subtitle">
  <Content type="static" editable="true">
    <Text>Transforming Business Intelligence Through Interactive Charts</Text>
    <PlaceholderText>Enter your presentation subtitle</PlaceholderText>
  </Content>
  <Styling>
    <TailwindClasses>text-xl text-blue-700 text-center max-w-3xl mb-8</TailwindClasses>
    <Typography fontSize="xl" textAlign="center"/>
    <Colors textColor="text-blue-700"/>
  </Styling>
  <Metadata createdAt="2024-01-01T00:00:00.000Z" category="subtitle">
    <Description>Presentation subtitle</Description>
    <Tags>
      <Tag>subtitle</Tag>
      <Tag>description</Tag>
    </Tags>
  </Metadata>
</TextComponent>`,
    createdAt: new Date(),
  },
  {
    id: "performance-title",
    name: "Performance Analysis Title",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<TextComponent xmlns="http://www.complonkers-hackathon/text_component" id="performance-title" name="Performance Analysis Title">
  <Content type="static" editable="true">
    <Text>Company Performance Analysis</Text>
    <PlaceholderText>Enter analysis title</PlaceholderText>
  </Content>
  <Styling>
    <TailwindClasses>text-3xl font-bold text-center mb-2 text-green-800</TailwindClasses>
    <Typography fontSize="3xl" fontWeight="bold" textAlign="center"/>
    <Colors textColor="text-green-800"/>
  </Styling>
  <Metadata createdAt="2024-01-01T00:00:00.000Z" category="section-title">
    <Description>Performance analysis section title</Description>
    <Tags>
      <Tag>section-title</Tag>
      <Tag>analysis</Tag>
    </Tags>
  </Metadata>
</TextComponent>`,
    createdAt: new Date(),
  },
];

// Sample data that will be provided to D3ChartRenderer separately
export const templateData = {
  "company-performance-data": [
    {
      company: "Apple",
      revenue: 394328,
      profit: 99803,
      employees: 164000,
      sector: "Hardware",
    },
    {
      company: "Microsoft",
      revenue: 211915,
      profit: 83383,
      employees: 221000,
      sector: "Software",
    },
    {
      company: "Alphabet",
      revenue: 307394,
      profit: 76033,
      employees: 190000,
      sector: "Software",
    },
    {
      company: "Amazon",
      revenue: 513983,
      profit: 33364,
      employees: 1540000,
      sector: "E-commerce",
    },
    {
      company: "Meta",
      revenue: 117929,
      profit: 39370,
      employees: 86482,
      sector: "Social Media",
    },
    {
      company: "Tesla",
      revenue: 96773,
      profit: 12556,
      employees: 140473,
      sector: "Automotive",
    },
    {
      company: "NVIDIA",
      revenue: 79775,
      profit: 29760,
      employees: 29600,
      sector: "Hardware",
    },
    {
      company: "Netflix",
      revenue: 33723,
      profit: 6106,
      employees: 13000,
      sector: "Media",
    },
  ],
  "organization-network-data": {
    nodes: [
      { id: "CEO", group: 1, size: 30, title: "Chief Executive Officer" },
      { id: "CTO", group: 1, size: 25, title: "Chief Technology Officer" },
      { id: "CFO", group: 1, size: 25, title: "Chief Financial Officer" },
      { id: "VP_Eng", group: 2, size: 20, title: "VP of Engineering" },
      { id: "VP_Sales", group: 2, size: 20, title: "VP of Sales" },
      { id: "VP_Marketing", group: 2, size: 20, title: "VP of Marketing" },
    ],
    links: [
      { source: "CEO", target: "CTO", value: 10 },
      { source: "CEO", target: "CFO", value: 8 },
      { source: "CTO", target: "VP_Eng", value: 9 },
      { source: "CEO", target: "VP_Sales", value: 7 },
      { source: "CEO", target: "VP_Marketing", value: 6 },
    ],
  },
  "world-gdp-data": [
    { country: "United States", gdp: 25462700, continent: "North America" },
    { country: "China", gdp: 17734000, continent: "Asia" },
    { country: "Japan", gdp: 4937000, continent: "Asia" },
    { country: "Germany", gdp: 4259000, continent: "Europe" },
    { country: "India", gdp: 3737000, continent: "Asia" },
  ],
};

// Complete slide structure for the 5-slide presentation
export const templateSlides = [
  { index: 0, layoutId: "title-layout" },
  { index: 1, layoutId: "company-performance-layout" },
  { index: 2, layoutId: "network-analysis-layout" },
  { index: 3, layoutId: "global-market-layout" },
  { index: 4, layoutId: "summary-layout" },
];
