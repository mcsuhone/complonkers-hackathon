// Export database instance and types
export { default as db } from "./db";
export type { Presentation, Slide, Layout, Chart, TextComponent } from "./db";

// Export services
export { presentationsService } from "./presentations";
export { slidesService } from "./slides";
export { layoutsService } from "./layouts";
export { chartsService } from "./charts";
export { textComponentsService } from "./textComponents";
