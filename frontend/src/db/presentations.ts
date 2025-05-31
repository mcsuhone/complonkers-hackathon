import db from "./db";
import type { Presentation } from "./db";

export const presentationsService = {
  // Create a new presentation
  create: async (presentation: Presentation): Promise<string> => {
    try {
      console.log("presentationsService.create called with:", presentation);
      console.log("Database instance:", db);
      console.log("Presentations table:", db.presentations);

      const result = await db.presentations.add(presentation);
      console.log("Database add result:", result);

      // Verify the presentation was actually added
      const saved = await db.presentations.get(presentation.id);
      console.log("Verification - saved presentation:", saved);

      return presentation.id;
    } catch (error) {
      console.error("Error in presentationsService.create:", error);
      throw error;
    }
  },

  // Get presentation by ID
  getById: async (id: string): Promise<Presentation | undefined> => {
    try {
      console.log("presentationsService.getById called with:", id);
      const result = await db.presentations.get(id);
      console.log("getById result:", result);
      return result;
    } catch (error) {
      console.error("Error in presentationsService.getById:", error);
      throw error;
    }
  },

  // Get all presentations
  getAll: async (): Promise<Presentation[]> => {
    try {
      console.log("presentationsService.getAll called");
      const result = await db.presentations
        .orderBy("createdAt")
        .reverse()
        .toArray();
      console.log("getAll result:", result);
      return result;
    } catch (error) {
      console.error("Error in presentationsService.getAll:", error);
      throw error;
    }
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
