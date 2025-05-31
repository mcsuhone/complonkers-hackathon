import Dexie from "dexie";
import type { Table } from "dexie";

// Presentation entity
export interface Presentation {
  id: string;
  prompt: string;
  audiences: string[];
  createdAt: Date;
}

// Layout entity
export interface Layout {
  id: string;
  slideId: string;
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
  slideId: string;
  title: string;
  contentDescription: string;
  dataInsights: string;
}

class AppDB extends Dexie {
  presentations!: Table<Presentation, string>;
  slides!: Table<Slide, number>;
  layouts!: Table<Layout, string>;
  charts!: Table<Chart, string>;
  textComponents!: Table<TextComponent, string>;

  constructor() {
    super("AppDB");

    // Version 1: Complete schema with all tables
    this.version(1).stores({
      presentations: "id, createdAt",
      slides: "++id, presentationId, index, slideId",
      layouts: "id, slideId, createdAt",
      charts: "id, type, createdAt",
      textComponents: "id, createdAt",
    });
  }
}

const db = new AppDB();

// Add some debugging
db.open()
  .then(() => {
    console.log("Database is ready");
    console.log("Database version:", db.verno);
    console.log(
      "Database tables:",
      db.tables.map((t) => t.name)
    );
  })
  .catch((error: any) => {
    console.error("Database initialization error:", error);
  });

export default db;
