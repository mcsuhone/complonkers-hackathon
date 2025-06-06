import db from "./db";
import type { Layout } from "./db";

export const layoutsService = {
  // Create a new layout
  create: async (layout: Layout): Promise<string> => {
    await db.layouts.add(layout);
    return layout.id;
  },

  // Create multiple layouts
  createMany: async (layouts: Layout[]): Promise<void> => {
    await db.layouts.bulkAdd(layouts);
  },

  // Get layout by ID
  getById: async (id: string): Promise<Layout | undefined> => {
    return await db.layouts.get(id);
  },

  // Get all layouts
  getAll: async (): Promise<Layout[]> => {
    return await db.layouts.orderBy("createdAt").toArray();
  },

  // Update layout
  update: async (
    id: string,
    updates: Partial<Omit<Layout, "id">>
  ): Promise<void> => {
    await db.layouts.update(id, updates);
  },

  // Delete layout
  delete: async (id: string): Promise<void> => {
    await db.layouts.delete(id);
  },

  // Clear all layouts
  clear: async (): Promise<void> => {
    await db.layouts.clear();
  },

  // Get layout by associated slideId (newest by createdAt)
  getBySlideId: async (slideId: string): Promise<Layout | undefined> => {
    // Return the newest layout record for this slideId
    const layouts = await db.layouts
      .where("slideId")
      .equals(slideId)
      .sortBy("createdAt");
    if (layouts.length === 0) return undefined;
    return layouts[layouts.length - 1];
  },
};
