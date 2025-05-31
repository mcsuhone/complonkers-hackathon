import db from "./db";
import type { TextComponent } from "./db";

export const textComponentsService = {
  // Create a new text component
  create: async (textComponent: TextComponent): Promise<string> => {
    await db.textComponents.add(textComponent);
    return textComponent.id;
  },

  // Create multiple text components
  createMany: async (textComponents: TextComponent[]): Promise<void> => {
    await db.textComponents.bulkAdd(textComponents);
  },

  // Get text component by ID
  getById: async (id: string): Promise<TextComponent | undefined> => {
    return await db.textComponents.get(id);
  },

  // Get all text components
  getAll: async (): Promise<TextComponent[]> => {
    return await db.textComponents.orderBy("createdAt").toArray();
  },

  // Update text component
  update: async (
    id: string,
    updates: Partial<Omit<TextComponent, "id">>
  ): Promise<void> => {
    await db.textComponents.update(id, updates);
  },

  // Delete text component
  delete: async (id: string): Promise<void> => {
    await db.textComponents.delete(id);
  },

  // Clear all text components
  clear: async (): Promise<void> => {
    await db.textComponents.clear();
  },
};
