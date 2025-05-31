import Dexie from "dexie";
import type { Table } from "dexie";

// Presentation entity
enum PresentationGeneratedFields {
  Id = "id",
}

export interface Presentation {
  id: string;
  prompt: string;
  audiences: string[];
  createdAt: Date;
}

// Layout entity
export interface Layout {
  id: string;
  name: string;
  xml: string;
  createdAt: Date;
}

// Chart entity
export interface Chart {
  id: string;
  name: string;
  xml: string;
  type: string;
  createdAt: Date;
}

// Text Component entity
export interface TextComponent {
  id: string;
  name: string;
  xml: string;
  createdAt: Date;
}

// Slide entity
export interface Slide {
  id?: number;
  presentationId: string;
  index: number;
  layoutId: string; // Reference to layout instead of embedded XML
}

class AppDB extends Dexie {
  presentations!: Table<Presentation, string>;
  slides!: Table<Slide, number>;
  layouts!: Table<Layout, string>;
  charts!: Table<Chart, string>;
  textComponents!: Table<TextComponent, string>;

  constructor() {
    super("AppDB");
    this.version(1).stores({
      presentations: "id", // Primary key: id
      slides: "++id, presentationId, index", // Auto-increment id, indexed by presentationId and index
    });

    // Version 2: Migrate from content to componentContent
    this.version(2)
      .stores({
        presentations: "id", // Primary key: id
        slides: "++id, presentationId, index", // Auto-increment id, indexed by presentationId and index
      })
      .upgrade(async (tx) => {
        // Migrate existing slides from content to componentContent
        const slides = await tx.table("slides").toArray();

        for (const slide of slides) {
          // If slide has old content field, migrate it to componentContent
          if (slide.content && !slide.componentContent) {
            const componentContent: Record<string, string> = {};

            // Try to extract component IDs from the layout XML and assign the content
            // For now, we'll create a default component with the content
            if (slide.content.trim()) {
              componentContent["default-content"] = slide.content;
            }

            // Update the slide with componentContent and remove old content field
            await tx.table("slides").update(slide.id, {
              componentContent,
              content: undefined, // Remove the old field
            });
          }
        }
      });

    // Version 3: Add new tables and migrate to layoutId system
    this.version(3)
      .stores({
        presentations: "id",
        slides: "++id, presentationId, index, layoutId",
        layouts: "id",
        charts: "id, type",
        textComponents: "id",
      })
      .upgrade(async (tx) => {
        // Migration logic for existing slides will be handled when we implement the new system
        // For now, we'll just ensure the new tables exist
      });
  }
}

const db = new AppDB();
export default db;
