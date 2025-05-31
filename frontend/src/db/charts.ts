import db from "./db";
import type { Chart } from "./db";

export const chartsService = {
  // Create a new chart
  create: async (chart: Chart): Promise<string> => {
    await db.charts.add(chart);
    return chart.id;
  },

  // Create multiple charts
  createMany: async (charts: Chart[]): Promise<void> => {
    await db.charts.bulkAdd(charts);
  },

  // Get chart by ID
  getById: async (id: string): Promise<Chart | undefined> => {
    return await db.charts.get(id);
  },

  // Get all charts
  getAll: async (): Promise<Chart[]> => {
    return await db.charts.orderBy("createdAt").toArray();
  },

  // Get charts by type
  getByType: async (type: string): Promise<Chart[]> => {
    return await db.charts.where("type").equals(type).toArray();
  },

  // Update chart
  update: async (
    id: string,
    updates: Partial<Omit<Chart, "id">>
  ): Promise<void> => {
    await db.charts.update(id, updates);
  },

  // Delete chart
  delete: async (id: string): Promise<void> => {
    await db.charts.delete(id);
  },

  // Clear all charts
  clear: async (): Promise<void> => {
    await db.charts.clear();
  },
};
