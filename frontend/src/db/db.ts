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

// Slide entity
export interface Slide {
  id?: number;
  presentationId: string;
  index: number;
  content: string;
  layout: string; // XML layout string adhering to slide_layout.xsd
}

class AppDB extends Dexie {
  presentations!: Table<Presentation, string>;
  slides!: Table<Slide, number>;

  constructor() {
    super("AppDB");
    this.version(1).stores({
      presentations: "id", // Primary key: id
      slides: "++id, presentationId, index", // Auto-increment id, indexed by presentationId and index
    });
  }
}

const db = new AppDB();
export default db;
