// Complex dummy data for various D3.js visualizations

// Time series data for financial charts
export const stockData = [
  {
    date: "2024-01-01",
    open: 150.25,
    high: 155.8,
    low: 148.9,
    close: 154.2,
    volume: 2500000,
  },
  {
    date: "2024-01-02",
    open: 154.2,
    high: 158.45,
    low: 152.1,
    close: 156.75,
    volume: 2800000,
  },
  {
    date: "2024-01-03",
    open: 156.75,
    high: 159.2,
    low: 154.3,
    close: 157.9,
    volume: 2200000,
  },
  {
    date: "2024-01-04",
    open: 157.9,
    high: 162.15,
    low: 156.8,
    close: 161.45,
    volume: 3100000,
  },
  {
    date: "2024-01-05",
    open: 161.45,
    high: 164.7,
    low: 159.25,
    close: 163.8,
    volume: 2900000,
  },
  {
    date: "2024-01-08",
    open: 163.8,
    high: 166.9,
    low: 161.5,
    close: 165.2,
    volume: 2600000,
  },
  {
    date: "2024-01-09",
    open: 165.2,
    high: 167.85,
    low: 163.4,
    close: 166.95,
    volume: 2400000,
  },
  {
    date: "2024-01-10",
    open: 166.95,
    high: 169.3,
    low: 164.8,
    close: 168.5,
    volume: 2700000,
  },
];

// Hierarchical data for treemap/sunburst
export const hierarchicalData = {
  name: "Technology Companies",
  children: [
    {
      name: "Software",
      children: [
        { name: "Microsoft", value: 2800000, category: "Enterprise" },
        { name: "Adobe", value: 280000, category: "Creative" },
        { name: "Salesforce", value: 310000, category: "CRM" },
        { name: "Oracle", value: 420000, category: "Database" },
        { name: "SAP", value: 350000, category: "Enterprise" },
      ],
    },
    {
      name: "Hardware",
      children: [
        { name: "Apple", value: 3940000, category: "Consumer" },
        { name: "NVIDIA", value: 1200000, category: "GPU" },
        { name: "Intel", value: 790000, category: "CPU" },
        { name: "AMD", value: 240000, category: "CPU" },
        { name: "Qualcomm", value: 350000, category: "Mobile" },
      ],
    },
    {
      name: "Cloud Services",
      children: [
        {
          name: "Amazon Web Services",
          value: 800000,
          category: "Infrastructure",
        },
        { name: "Google Cloud", value: 340000, category: "Infrastructure" },
        { name: "Microsoft Azure", value: 600000, category: "Infrastructure" },
        { name: "Alibaba Cloud", value: 120000, category: "Infrastructure" },
      ],
    },
    {
      name: "Social Media",
      children: [
        { name: "Meta", value: 1180000, category: "Social" },
        { name: "Twitter", value: 50000, category: "Social" },
        { name: "LinkedIn", value: 150000, category: "Professional" },
        { name: "TikTok", value: 110000, category: "Video" },
        { name: "Snapchat", value: 45000, category: "Messaging" },
      ],
    },
  ],
};

// Network/graph data for force-directed layouts
export const networkData = {
  nodes: [
    { id: "CEO", group: 1, size: 30, title: "Chief Executive Officer" },
    { id: "CTO", group: 1, size: 25, title: "Chief Technology Officer" },
    { id: "CFO", group: 1, size: 25, title: "Chief Financial Officer" },
    { id: "VP_Eng", group: 2, size: 20, title: "VP of Engineering" },
    { id: "VP_Sales", group: 2, size: 20, title: "VP of Sales" },
    { id: "VP_Marketing", group: 2, size: 20, title: "VP of Marketing" },
    { id: "Dir_Frontend", group: 3, size: 15, title: "Director of Frontend" },
    { id: "Dir_Backend", group: 3, size: 15, title: "Director of Backend" },
    { id: "Dir_DevOps", group: 3, size: 15, title: "Director of DevOps" },
    { id: "Dir_Data", group: 3, size: 15, title: "Director of Data Science" },
    { id: "Lead_React", group: 4, size: 12, title: "React Team Lead" },
    { id: "Lead_Node", group: 4, size: 12, title: "Node.js Team Lead" },
    { id: "Lead_Python", group: 4, size: 12, title: "Python Team Lead" },
    { id: "Lead_ML", group: 4, size: 12, title: "ML Team Lead" },
    { id: "Dev_1", group: 5, size: 8, title: "Senior Developer" },
    { id: "Dev_2", group: 5, size: 8, title: "Senior Developer" },
    { id: "Dev_3", group: 5, size: 8, title: "Senior Developer" },
    { id: "Dev_4", group: 5, size: 8, title: "Senior Developer" },
    { id: "Dev_5", group: 5, size: 8, title: "Senior Developer" },
    { id: "Dev_6", group: 5, size: 8, title: "Senior Developer" },
  ],
  links: [
    { source: "CEO", target: "CTO", value: 10 },
    { source: "CEO", target: "CFO", value: 8 },
    { source: "CTO", target: "VP_Eng", value: 9 },
    { source: "CEO", target: "VP_Sales", value: 7 },
    { source: "CEO", target: "VP_Marketing", value: 6 },
    { source: "VP_Eng", target: "Dir_Frontend", value: 8 },
    { source: "VP_Eng", target: "Dir_Backend", value: 8 },
    { source: "VP_Eng", target: "Dir_DevOps", value: 7 },
    { source: "VP_Eng", target: "Dir_Data", value: 6 },
    { source: "Dir_Frontend", target: "Lead_React", value: 9 },
    { source: "Dir_Backend", target: "Lead_Node", value: 8 },
    { source: "Dir_Backend", target: "Lead_Python", value: 7 },
    { source: "Dir_Data", target: "Lead_ML", value: 8 },
    { source: "Lead_React", target: "Dev_1", value: 6 },
    { source: "Lead_React", target: "Dev_2", value: 6 },
    { source: "Lead_Node", target: "Dev_3", value: 5 },
    { source: "Lead_Python", target: "Dev_4", value: 5 },
    { source: "Lead_ML", target: "Dev_5", value: 7 },
    { source: "Lead_ML", target: "Dev_6", value: 6 },
  ],
};

// Geographic data (simplified GeoJSON for world map)
export const worldMapData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "United States",
        population: 331900000,
        gdp: 25462700000000,
        continent: "North America",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-180, 90],
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "China",
        population: 1412000000,
        gdp: 17734000000000,
        continent: "Asia",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-180, 90],
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Germany",
        population: 83200000,
        gdp: 4259000000000,
        continent: "Europe",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-180, 90],
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
          ],
        ],
      },
    },
  ],
};

// City coordinates for scatter plot on map
export const cityData = [
  {
    name: "New York",
    lat: 40.7128,
    lng: -74.006,
    population: 8336817,
    country: "USA",
  },
  {
    name: "London",
    lat: 51.5074,
    lng: -0.1278,
    population: 9648110,
    country: "UK",
  },
  {
    name: "Tokyo",
    lat: 35.6762,
    lng: 139.6503,
    population: 37400068,
    country: "Japan",
  },
  {
    name: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    population: 11017230,
    country: "France",
  },
  {
    name: "Sydney",
    lat: -33.8688,
    lng: 151.2093,
    population: 5312163,
    country: "Australia",
  },
  {
    name: "São Paulo",
    lat: -23.5505,
    lng: -46.6333,
    population: 22430000,
    country: "Brazil",
  },
  {
    name: "Mumbai",
    lat: 19.076,
    lng: 72.8777,
    population: 20411274,
    country: "India",
  },
  {
    name: "Cairo",
    lat: 30.0444,
    lng: 31.2357,
    population: 20900604,
    country: "Egypt",
  },
  {
    name: "Lagos",
    lat: 6.5244,
    lng: 3.3792,
    population: 15388000,
    country: "Nigeria",
  },
  {
    name: "Moscow",
    lat: 55.7558,
    lng: 37.6176,
    population: 12506468,
    country: "Russia",
  },
];

// Multi-dimensional data for parallel coordinates
export const parallelData = [
  {
    name: "Product A",
    price: 299,
    quality: 8.5,
    satisfaction: 7.8,
    sales: 15000,
    category: "Electronics",
  },
  {
    name: "Product B",
    price: 199,
    quality: 7.2,
    satisfaction: 8.1,
    sales: 22000,
    category: "Electronics",
  },
  {
    name: "Product C",
    price: 449,
    quality: 9.1,
    satisfaction: 8.9,
    sales: 8500,
    category: "Electronics",
  },
  {
    name: "Product D",
    price: 89,
    quality: 6.8,
    satisfaction: 7.2,
    sales: 35000,
    category: "Home",
  },
  {
    name: "Product E",
    price: 159,
    quality: 7.9,
    satisfaction: 8.3,
    sales: 18000,
    category: "Home",
  },
  {
    name: "Product F",
    price: 329,
    quality: 8.7,
    satisfaction: 8.6,
    sales: 12000,
    category: "Fashion",
  },
  {
    name: "Product G",
    price: 79,
    quality: 6.5,
    satisfaction: 7.0,
    sales: 28000,
    category: "Fashion",
  },
  {
    name: "Product H",
    price: 599,
    quality: 9.5,
    satisfaction: 9.2,
    sales: 5500,
    category: "Luxury",
  },
  {
    name: "Product I",
    price: 249,
    quality: 8.0,
    satisfaction: 8.0,
    sales: 16000,
    category: "Sports",
  },
  {
    name: "Product J",
    price: 399,
    quality: 8.8,
    satisfaction: 8.7,
    sales: 9800,
    category: "Sports",
  },
];

// Sankey diagram data (energy flow)
export const sankeyData = {
  nodes: [
    { id: 0, name: "Coal" },
    { id: 1, name: "Natural Gas" },
    { id: 2, name: "Nuclear" },
    { id: 3, name: "Hydro" },
    { id: 4, name: "Wind" },
    { id: 5, name: "Solar" },
    { id: 6, name: "Electricity Generation" },
    { id: 7, name: "Residential" },
    { id: 8, name: "Commercial" },
    { id: 9, name: "Industrial" },
    { id: 10, name: "Transportation" },
  ],
  links: [
    { source: 0, target: 6, value: 35 },
    { source: 1, target: 6, value: 40 },
    { source: 2, target: 6, value: 20 },
    { source: 3, target: 6, value: 7 },
    { source: 4, target: 6, value: 8 },
    { source: 5, target: 6, value: 3 },
    { source: 6, target: 7, value: 38 },
    { source: 6, target: 8, value: 36 },
    { source: 6, target: 9, value: 26 },
    { source: 1, target: 10, value: 13 },
  ],
};

// Chord diagram data (trade relationships)
export const chordData = {
  names: ["USA", "China", "Germany", "Japan", "UK", "France", "India", "Italy"],
  matrix: [
    [0, 120, 80, 60, 40, 30, 25, 20],
    [120, 0, 90, 70, 35, 25, 45, 15],
    [80, 90, 0, 50, 60, 70, 20, 40],
    [60, 70, 50, 0, 30, 25, 35, 30],
    [40, 35, 60, 30, 0, 45, 15, 25],
    [30, 25, 70, 25, 45, 0, 10, 35],
    [25, 45, 20, 35, 15, 10, 0, 8],
    [20, 15, 40, 30, 25, 35, 8, 0],
  ],
};

// Heatmap data (correlation matrix)
export const heatmapData = [
  { x: "Revenue", y: "Marketing Spend", value: 0.85 },
  { x: "Revenue", y: "Customer Satisfaction", value: 0.72 },
  { x: "Revenue", y: "Product Quality", value: 0.68 },
  { x: "Revenue", y: "Brand Awareness", value: 0.79 },
  { x: "Revenue", y: "Market Share", value: 0.91 },
  { x: "Marketing Spend", y: "Customer Satisfaction", value: 0.45 },
  { x: "Marketing Spend", y: "Product Quality", value: 0.32 },
  { x: "Marketing Spend", y: "Brand Awareness", value: 0.88 },
  { x: "Marketing Spend", y: "Market Share", value: 0.76 },
  { x: "Customer Satisfaction", y: "Product Quality", value: 0.82 },
  { x: "Customer Satisfaction", y: "Brand Awareness", value: 0.58 },
  { x: "Customer Satisfaction", y: "Market Share", value: 0.69 },
  { x: "Product Quality", y: "Brand Awareness", value: 0.41 },
  { x: "Product Quality", y: "Market Share", value: 0.55 },
  { x: "Brand Awareness", y: "Market Share", value: 0.73 },
];

// Calendar data (GitHub-style contribution graph)
export const calendarData = Array.from({ length: 365 }, (_, i) => {
  const date = new Date(2024, 0, 1);
  date.setDate(date.getDate() + i);
  return {
    date: date.toISOString().split("T")[0],
    value: Math.floor(Math.random() * 5),
    day: date.getDay(),
    week: Math.floor(i / 7),
  };
});

// Radar chart data (skill assessment)
export const radarData = [
  {
    name: "Frontend Developer",
    axes: [
      { axis: "JavaScript", value: 9 },
      { axis: "React", value: 8.5 },
      { axis: "CSS", value: 8 },
      { axis: "TypeScript", value: 7.5 },
      { axis: "Testing", value: 7 },
      { axis: "Performance", value: 6.5 },
      { axis: "Accessibility", value: 6 },
      { axis: "Design", value: 5.5 },
    ],
  },
  {
    name: "Backend Developer",
    axes: [
      { axis: "JavaScript", value: 8 },
      { axis: "React", value: 4 },
      { axis: "CSS", value: 3 },
      { axis: "TypeScript", value: 8.5 },
      { axis: "Testing", value: 9 },
      { axis: "Performance", value: 8.5 },
      { axis: "Accessibility", value: 3 },
      { axis: "Design", value: 2 },
    ],
  },
  {
    name: "Full Stack Developer",
    axes: [
      { axis: "JavaScript", value: 8.5 },
      { axis: "React", value: 7.5 },
      { axis: "CSS", value: 6.5 },
      { axis: "TypeScript", value: 8 },
      { axis: "Testing", value: 8 },
      { axis: "Performance", value: 7.5 },
      { axis: "Accessibility", value: 5 },
      { axis: "Design", value: 4.5 },
    ],
  },
];

// Streamgraph data (music genre popularity over time)
export const streamData = [
  {
    year: 2010,
    rock: 35,
    pop: 25,
    hiphop: 15,
    electronic: 10,
    country: 8,
    jazz: 4,
    classical: 3,
  },
  {
    year: 2011,
    rock: 33,
    pop: 27,
    hiphop: 16,
    electronic: 11,
    country: 7,
    jazz: 3,
    classical: 3,
  },
  {
    year: 2012,
    rock: 31,
    pop: 28,
    hiphop: 18,
    electronic: 12,
    country: 6,
    jazz: 3,
    classical: 2,
  },
  {
    year: 2013,
    rock: 29,
    pop: 29,
    hiphop: 20,
    electronic: 13,
    country: 5,
    jazz: 2,
    classical: 2,
  },
  {
    year: 2014,
    rock: 27,
    pop: 30,
    hiphop: 22,
    electronic: 14,
    country: 4,
    jazz: 2,
    classical: 1,
  },
  {
    year: 2015,
    rock: 25,
    pop: 31,
    hiphop: 24,
    electronic: 15,
    country: 3,
    jazz: 1,
    classical: 1,
  },
  {
    year: 2016,
    rock: 23,
    pop: 32,
    hiphop: 26,
    electronic: 16,
    country: 2,
    jazz: 1,
    classical: 0,
  },
  {
    year: 2017,
    rock: 21,
    pop: 33,
    hiphop: 28,
    electronic: 17,
    country: 1,
    jazz: 0,
    classical: 0,
  },
  {
    year: 2018,
    rock: 19,
    pop: 34,
    hiphop: 30,
    electronic: 16,
    country: 1,
    jazz: 0,
    classical: 0,
  },
  {
    year: 2019,
    rock: 17,
    pop: 35,
    hiphop: 32,
    electronic: 15,
    country: 1,
    jazz: 0,
    classical: 0,
  },
  {
    year: 2020,
    rock: 15,
    pop: 36,
    hiphop: 34,
    electronic: 14,
    country: 1,
    jazz: 0,
    classical: 0,
  },
  {
    year: 2021,
    rock: 13,
    pop: 37,
    hiphop: 36,
    electronic: 13,
    country: 1,
    jazz: 0,
    classical: 0,
  },
  {
    year: 2022,
    rock: 11,
    pop: 38,
    hiphop: 38,
    electronic: 12,
    country: 1,
    jazz: 0,
    classical: 0,
  },
  {
    year: 2023,
    rock: 9,
    pop: 39,
    hiphop: 40,
    electronic: 11,
    country: 1,
    jazz: 0,
    classical: 0,
  },
  {
    year: 2024,
    rock: 7,
    pop: 40,
    hiphop: 42,
    electronic: 10,
    country: 1,
    jazz: 0,
    classical: 0,
  },
];

// Matrix data (adjacency matrix for network)
export const matrixData = [
  { source: 0, target: 0, value: 0 },
  { source: 0, target: 1, value: 1 },
  { source: 0, target: 2, value: 0 },
  { source: 0, target: 3, value: 1 },
  { source: 1, target: 0, value: 1 },
  { source: 1, target: 1, value: 0 },
  { source: 1, target: 2, value: 1 },
  { source: 1, target: 3, value: 0 },
  { source: 2, target: 0, value: 0 },
  { source: 2, target: 1, value: 1 },
  { source: 2, target: 2, value: 0 },
  { source: 2, target: 3, value: 1 },
  { source: 3, target: 0, value: 1 },
  { source: 3, target: 1, value: 0 },
  { source: 3, target: 2, value: 1 },
  { source: 3, target: 3, value: 0 },
];

// Bubble chart data (company performance)
export const bubbleData = [
  {
    company: "Apple",
    revenue: 394328,
    profit: 99803,
    employees: 164000,
    sector: "Technology",
  },
  {
    company: "Microsoft",
    revenue: 198270,
    profit: 72361,
    employees: 221000,
    sector: "Technology",
  },
  {
    company: "Alphabet",
    revenue: 282836,
    profit: 76033,
    employees: 174014,
    sector: "Technology",
  },
  {
    company: "Amazon",
    revenue: 513983,
    profit: 33364,
    employees: 1608000,
    sector: "E-commerce",
  },
  {
    company: "Tesla",
    revenue: 96773,
    profit: 12556,
    employees: 127855,
    sector: "Automotive",
  },
  {
    company: "Meta",
    revenue: 117929,
    profit: 39370,
    employees: 86482,
    sector: "Social Media",
  },
  {
    company: "Berkshire Hathaway",
    revenue: 302089,
    profit: 89795,
    employees: 383000,
    sector: "Conglomerate",
  },
  {
    company: "NVIDIA",
    revenue: 60922,
    profit: 29760,
    employees: 29600,
    sector: "Semiconductors",
  },
  {
    company: "JPMorgan Chase",
    revenue: 128695,
    profit: 48334,
    employees: 288474,
    sector: "Banking",
  },
  {
    company: "Johnson & Johnson",
    revenue: 94943,
    profit: 20878,
    employees: 152700,
    sector: "Healthcare",
  },
];

// Violin plot data (distribution comparison)
export const violinData = [
  {
    group: "Group A",
    values: [12, 15, 18, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50],
  },
  {
    group: "Group B",
    values: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64],
  },
  {
    group: "Group C",
    values: [20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
  },
  {
    group: "Group D",
    values: [5, 10, 15, 25, 35, 45, 55, 65, 75, 85, 90, 92, 94, 96, 98],
  },
];

// Box plot data (statistical summary)
export const boxPlotData = [
  {
    category: "Q1 Sales",
    min: 45000,
    q1: 52000,
    median: 58000,
    q3: 65000,
    max: 78000,
    outliers: [42000, 81000, 83000],
  },
  {
    category: "Q2 Sales",
    min: 48000,
    q1: 55000,
    median: 62000,
    q3: 69000,
    max: 82000,
    outliers: [44000, 85000],
  },
  {
    category: "Q3 Sales",
    min: 52000,
    q1: 59000,
    median: 66000,
    q3: 73000,
    max: 86000,
    outliers: [49000, 89000, 91000],
  },
  {
    category: "Q4 Sales",
    min: 58000,
    q1: 65000,
    median: 72000,
    q3: 79000,
    max: 92000,
    outliers: [55000, 95000],
  },
];

// Export all data
export const dummyData = {
  stockData,
  hierarchicalData,
  networkData,
  worldMapData,
  cityData,
  parallelData,
  sankeyData,
  chordData,
  heatmapData,
  calendarData,
  radarData,
  streamData,
  matrixData,
  bubbleData,
  violinData,
  boxPlotData,
};
