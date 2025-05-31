import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  presentationsService,
  slidesService,
  layoutsService,
  chartsService,
  textComponentsService,
} from "@/db";
import type { Presentation, Slide } from "@/db";
import {
  templateLayouts,
  templateCharts,
  templateTextComponents,
  templateSlides,
} from "@/data/presentationTemplate";

// Query keys
export const presentationKeys = {
  all: ["presentations"] as const,
  detail: (id: string) => ["presentations", id] as const,
};

// Get all presentations
export const usePresentations = () => {
  return useQuery({
    queryKey: presentationKeys.all,
    queryFn: () => presentationsService.getAll(),
  });
};

// Get presentation by ID
export const usePresentation = (id: string) => {
  return useQuery({
    queryKey: presentationKeys.detail(id),
    queryFn: () => presentationsService.getById(id),
    enabled: !!id,
  });
};

// Create presentation with template data seeding
export const useCreatePresentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ presentation }: { presentation: Presentation }) => {
      // 1. Create presentation
      await presentationsService.create(presentation);

      // 2. Seed template data into database
      await Promise.all([
        layoutsService.createMany(templateLayouts),
        chartsService.createMany(templateCharts),
        textComponentsService.createMany(templateTextComponents),
      ]);

      // 3. Create slides with layoutId references
      const slides: Omit<Slide, "id">[] = templateSlides.map(
        (slideTemplate) => ({
          presentationId: presentation.id,
          index: slideTemplate.index,
          layoutId: slideTemplate.layoutId,
        })
      );

      await Promise.all(slides.map((slide) => slidesService.create(slide)));

      return presentation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
};

// Update presentation
export const useUpdatePresentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Presentation, "id">>;
    }) => {
      await presentationsService.update(id, updates);
      return { id, updates };
    },
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: presentationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
};

// Delete presentation
export const useDeletePresentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete associated slides first
      const slides = await slidesService.getByPresentationId(id);
      await Promise.all(
        slides.map((slide) => slidesService.delete(slide.id!, id))
      );

      // Delete presentation
      await presentationsService.delete(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
};
