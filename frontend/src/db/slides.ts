import db from "./db";
import type { Slide } from "./db";

export const slidesService = {
  // Create a new slide
  create: async (slide: Omit<Slide, "id">): Promise<number> => {
    return await db.slides.add(slide);
  },

  // Create multiple slides
  createMany: async (slides: Omit<Slide, "id">[]): Promise<void> => {
    await db.slides.bulkAdd(slides);
  },

  // Get slides by presentation ID
  getByPresentationId: async (presentationId: string): Promise<Slide[]> => {
    const slides = await db.slides
      .where("presentationId")
      .equals(presentationId)
      .toArray();
    return slides.sort((a, b) => a.index - b.index);
  },

  // Get slide by ID
  getById: async (id: number): Promise<Slide | undefined> => {
    return await db.slides.get(id);
  },

  // Update slide layout ID
  updateLayoutId: async (id: number, layoutId: string): Promise<void> => {
    await db.slides.update(id, { layoutId });
  },

  // Update slide with partial updates
  updateSlide: async (
    id: number,
    updates: { layoutId?: string; index?: number }
  ): Promise<void> => {
    await db.slides.update(id, updates);
  },

  // Update slide index
  updateIndex: async (id: number, index: number): Promise<void> => {
    await db.slides.update(id, { index });
  },

  // Delete slide and reindex remaining slides
  delete: async (slideId: number, presentationId: string): Promise<void> => {
    await db.transaction("rw", db.slides, async () => {
      const slideToDelete = await db.slides.get(slideId);
      if (!slideToDelete) return;

      const removedIndex = slideToDelete.index;

      // Delete the slide
      await db.slides.delete(slideId);

      // Reindex slides that come after the deleted one
      const laterSlides = await db.slides
        .where("presentationId")
        .equals(presentationId)
        .and((s) => s.index > removedIndex)
        .toArray();

      await Promise.all(
        laterSlides.map((s) => db.slides.update(s.id!, { index: s.index - 1 }))
      );
    });
  },

  // Delete all slides for a presentation
  deleteByPresentationId: async (presentationId: string): Promise<void> => {
    await db.slides.where("presentationId").equals(presentationId).delete();
  },
};
