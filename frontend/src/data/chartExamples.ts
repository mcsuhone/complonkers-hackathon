// Example chart definition XML strings demonstrating various D3.js capabilities

export const networkChartXml = `
<ChartDefinition id="org-network" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="network" title="Organization Network" theme="dark">
    <Dimensions width="800" height="600" responsive="true"/>
    <Margins top="40" right="20" bottom="20" left="20"/>
    <Force alphaMin="0.001" alphaDecay="0.0228" velocityDecay="0.4">
      <Forces>
        <CenterForce x="400" y="300" strength="1"/>
        <CollideForce radius="15" strength="0.8" iterations="2"/>
        <LinkForce distance="50" strength="0.6"/>
        <ManyBodyForce strength="-100" theta="0.9" distanceMin="1"/>
      </Forces>
    </Force>
    <Transition duration="1000" ease="ease-in-out"/>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="networkData"/>
    <DataMapping>
      <Field name="id" role="id" dataType="string"/>
      <Field name="group" role="color" dataType="number"/>
      <Field name="size" role="size" dataType="number"/>
      <Field name="title" role="tooltip" dataType="string"/>
      <Field name="source" role="source" dataType="string"/>
      <Field name="target" role="target" dataType="string"/>
      <Field name="value" role="weight" dataType="number"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="category10" primary="#1f77b4" secondary="#ff7f0e"/>
    <Fonts family="Arial" size="12" titleSize="18"/>
    <Animation enabled="true" duration="750" easing="ease"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{title}: Group {group}"/>
    <Drag enabled="true"/>
    <Hover enabled="true" highlight="true"/>
    <Click enabled="true" action="select"/>
  </Interactions>
</ChartDefinition>`;

export const treemapChartXml = `
<ChartDefinition id="tech-treemap" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="treemap" title="Technology Companies Market Cap" subtitle="Hierarchical visualization">
    <Dimensions width="900" height="500" responsive="true"/>
    <Margins top="60" right="10" bottom="10" left="10"/>
    <Hierarchy tile="squarify" padding="2" ratio="1.618" round="true"/>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="hierarchicalData"/>
    <DataMapping>
      <Field name="name" role="label" dataType="string"/>
      <Field name="value" role="value" dataType="number"/>
      <Field name="category" role="color" dataType="string"/>
      <Field name="children" role="children" dataType="string"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="spectral" primary="#d62728" secondary="#2ca02c"/>
    <Fonts family="Helvetica" size="11" titleSize="16"/>
    <Animation enabled="true" duration="500" easing="ease-out"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{name}: \${value:,.0f}M"/>
    <Hover enabled="true" highlight="true" delay="100"/>
    <Click enabled="true" action="drill-down"/>
  </Interactions>
</ChartDefinition>`;

export const choroplethMapXml = `
<ChartDefinition id="world-gdp-map" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="choropleth" title="World GDP by Country" subtitle="Economic data visualization">
    <Dimensions width="1000" height="600" responsive="true"/>
    <Margins top="50" right="20" bottom="20" left="20"/>
    <Projection type="naturalEarth" scale="150" center="[0, 0]"/>
  </ChartConfig>
  <Data>
    <DataSource type="geojson" placeholder="worldMapData"/>
    <DataMapping>
      <Field name="name" role="label" dataType="string"/>
      <Field name="gdp" role="value" dataType="number"/>
      <Field name="population" role="size" dataType="number"/>
      <Field name="continent" role="category" dataType="string"/>
      <Field name="geometry" role="geometry" dataType="string"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="blues" primary="#08519c" secondary="#f7fbff"/>
    <Fonts family="Arial" size="10" titleSize="18"/>
    <Animation enabled="true" duration="800" easing="ease"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{name}: \${gdp:,.0f}B GDP"/>
    <Zoom enabled="true" scaleExtent="[1, 8]"/>
    <Pan enabled="true"/>
    <Hover enabled="true" highlight="true"/>
  </Interactions>
</ChartDefinition>`;

export const sankeyChartXml = `
<ChartDefinition id="energy-sankey" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="sankey" title="Energy Flow Diagram" subtitle="From sources to consumption">
    <Dimensions width="800" height="500" responsive="true"/>
    <Margins top="50" right="20" bottom="20" left="20"/>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="sankeyData"/>
    <DataMapping>
      <Field name="name" role="label" dataType="string"/>
      <Field name="source" role="source" dataType="number"/>
      <Field name="target" role="target" dataType="number"/>
      <Field name="value" role="value" dataType="number"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="category20" primary="#1f77b4" secondary="#aec7e8"/>
    <Fonts family="Arial" size="12" titleSize="16"/>
    <Animation enabled="true" duration="1000" easing="ease-in-out"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{source} → {target}: {value} TWh"/>
    <Hover enabled="true" highlight="true"/>
  </Interactions>
</ChartDefinition>`;

export const heatmapChartXml = `
<ChartDefinition id="correlation-heatmap" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="heatmap" title="Business Metrics Correlation" subtitle="Correlation matrix visualization">
    <Dimensions width="600" height="500" responsive="true"/>
    <Margins top="60" right="100" bottom="100" left="100"/>
    <Axes>
      <XAxis label="Metrics" scale="band" gridLines="false"/>
      <YAxis label="Metrics" scale="band" gridLines="false"/>
    </Axes>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="heatmapData"/>
    <DataMapping>
      <Field name="x" role="x" dataType="string"/>
      <Field name="y" role="y" dataType="string"/>
      <Field name="value" role="value" dataType="number"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="rdbu" primary="#d73027" secondary="#313695"/>
    <Fonts family="Arial" size="10" titleSize="16"/>
    <Animation enabled="true" duration="600" easing="ease"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{x} vs {y}: {value:.2f}"/>
    <Hover enabled="true" highlight="true"/>
  </Interactions>
</ChartDefinition>`;

export const radarChartXml = `
<ChartDefinition id="skills-radar" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="radar" title="Developer Skills Assessment" subtitle="Multi-dimensional comparison">
    <Dimensions width="500" height="500" responsive="true"/>
    <Margins top="50" right="50" bottom="50" left="50"/>
    <Axes>
      <XAxis scale="linear" domain="[0, 10]"/>
      <YAxis scale="linear" domain="[0, 10]"/>
    </Axes>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="radarData"/>
    <DataMapping>
      <Field name="axis" role="category" dataType="string"/>
      <Field name="value" role="value" dataType="number"/>
      <Field name="name" role="series" dataType="string"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="category10" primary="#1f77b4" secondary="#ff7f0e"/>
    <Fonts family="Arial" size="11" titleSize="16"/>
    <Animation enabled="true" duration="800" easing="ease-out"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{name} - {axis}: {value}/10"/>
    <Hover enabled="true" highlight="true"/>
  </Interactions>
</ChartDefinition>`;

export const candlestickChartXml = `
<ChartDefinition id="stock-candlestick" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="candlestick" title="Stock Price Movement" subtitle="OHLC financial data">
    <Dimensions width="800" height="400" responsive="true"/>
    <Margins top="50" right="50" bottom="50" left="60"/>
    <Axes>
      <XAxis label="Date" scale="time" gridLines="true"/>
      <YAxis label="Price (\$)" scale="linear" gridLines="true"/>
    </Axes>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="stockData"/>
    <DataMapping>
      <Field name="date" role="x" dataType="date"/>
      <Field name="open" role="open" dataType="number"/>
      <Field name="high" role="high" dataType="number"/>
      <Field name="low" role="low" dataType="number"/>
      <Field name="close" role="close" dataType="number"/>
      <Field name="volume" role="size" dataType="number"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="rdylgn" primary="#d73027" secondary="#1a9850"/>
    <Fonts family="Arial" size="11" titleSize="16"/>
    <Animation enabled="true" duration="500" easing="ease"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="Date: {date}&lt;br/&gt;Open: \${open}&lt;br/&gt;High: \${high}&lt;br/&gt;Low: \${low}&lt;br/&gt;Close: \${close}"/>
    <Zoom enabled="true" scaleExtent="[1, 10]"/>
    <Brush enabled="true" axis="x"/>
    <Hover enabled="true" highlight="true"/>
  </Interactions>
</ChartDefinition>`;

export const streamgraphChartXml = `
<ChartDefinition id="music-stream" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="streamgraph" title="Music Genre Popularity Over Time" subtitle="Stacked area chart with flowing curves">
    <Dimensions width="900" height="400" responsive="true"/>
    <Margins top="50" right="100" bottom="50" left="50"/>
    <Axes>
      <XAxis label="Year" scale="linear" gridLines="false"/>
      <YAxis label="Popularity %" scale="linear" gridLines="true"/>
    </Axes>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="streamData"/>
    <DataMapping>
      <Field name="year" role="x" dataType="number"/>
      <Field name="rock" role="series" dataType="number"/>
      <Field name="pop" role="series" dataType="number"/>
      <Field name="hiphop" role="series" dataType="number"/>
      <Field name="electronic" role="series" dataType="number"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="category20" primary="#1f77b4" secondary="#aec7e8"/>
    <Fonts family="Arial" size="11" titleSize="16"/>
    <Animation enabled="true" duration="1200" easing="ease-in-out"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{series}: {value}% in {year}"/>
    <Hover enabled="true" highlight="true"/>
    <Brush enabled="true" axis="x"/>
  </Interactions>
</ChartDefinition>`;

export const bubbleChartXml = `
<ChartDefinition id="company-bubble" xmlns="http://www.complonkers-hackathon/chart_definition">
  <ChartConfig type="bubble" title="Company Performance Analysis" subtitle="Revenue vs Profit with Employee Count">
    <Dimensions width="800" height="600" responsive="true"/>
    <Margins top="60" right="50" bottom="60" left="80"/>
    <Axes>
      <XAxis label="Revenue (Millions \$)" scale="linear" gridLines="true"/>
      <YAxis label="Profit (Millions \$)" scale="linear" gridLines="true"/>
    </Axes>
    <Legend show="true" position="right" orientation="vertical"/>
  </ChartConfig>
  <Data>
    <DataSource type="mock" placeholder="bubbleData"/>
    <DataMapping>
      <Field name="revenue" role="x" dataType="number"/>
      <Field name="profit" role="y" dataType="number"/>
      <Field name="employees" role="size" dataType="number"/>
      <Field name="company" role="label" dataType="string"/>
      <Field name="sector" role="color" dataType="string"/>
    </DataMapping>
  </Data>
  <Styling>
    <Colors scheme="set3" primary="#8dd3c7" secondary="#ffffb3"/>
    <Fonts family="Arial" size="11" titleSize="16"/>
    <Animation enabled="true" duration="800" easing="ease-out"/>
  </Styling>
  <Interactions>
    <Tooltip enabled="true" format="{company}&lt;br/&gt;Revenue: \${revenue:,.0f}M&lt;br/&gt;Profit: \${profit:,.0f}M&lt;br/&gt;Employees: {employees:,.0f}"/>
    <Zoom enabled="true" scaleExtent="[0.5, 5]"/>
    <Hover enabled="true" highlight="true"/>
    <Selection enabled="true" multiple="true" mode="lasso"/>
  </Interactions>
</ChartDefinition>`;

// Export all examples
export const chartExamples = {
  networkChartXml,
  treemapChartXml,
  choroplethMapXml,
  sankeyChartXml,
  heatmapChartXml,
  radarChartXml,
  candlestickChartXml,
  streamgraphChartXml,
  bubbleChartXml,
};
