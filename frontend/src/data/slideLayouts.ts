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
          <Chart type="bar" classes="w-full h-96 bg-card rounded-lg p-4" placeholder="Main chart visualization"/>
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
};

export const getRandomLayout = (): string => {
  const layouts = Object.values(slideLayouts);
  return layouts[Math.floor(Math.random() * layouts.length)];
};

export const getLayoutByType = (
  type: "title" | "content" | "chart"
): string => {
  switch (type) {
    case "title":
      return slideLayouts.titleSlide;
    case "content":
      return slideLayouts.contentSlide;
    case "chart":
      return slideLayouts.chartSlide;
    default:
      return slideLayouts.contentSlide;
  }
};
