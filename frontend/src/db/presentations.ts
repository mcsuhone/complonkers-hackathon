import db from "./db";
import type { Presentation } from "./db";

export const presentationsService = {
  // Create a new presentation
  create: async (presentation: Presentation): Promise<string> => {
    await db.presentations.add(presentation);
    return presentation.id;
  },

  // Get presentation by ID
  getById: async (id: string): Promise<Presentation | undefined> => {
    return await db.presentations.get(id);
  },

  // Get all presentations
  getAll: async (): Promise<Presentation[]> => {
    return await db.presentations.orderBy("createdAt").reverse().toArray();
  },

  // Update presentation
  update: async (
    id: string,
    updates: Partial<Omit<Presentation, "id">>
  ): Promise<void> => {
    await db.presentations.update(id, updates);
  },

  // Delete presentation
  delete: async (id: string): Promise<void> => {
    await db.presentations.delete(id);
  },
};
