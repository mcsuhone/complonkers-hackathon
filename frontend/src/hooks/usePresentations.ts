import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { presentationsService, slidesService } from "@/db";
import type { Presentation, Slide } from "@/db";
import { getLayoutByType } from "@/data/slideLayouts";

// Query keys
export const presentationKeys = {
  all: ["presentations"] as const,
  detail: (id: string) => ["presentations", id] as const,
};

// Get all presentations
export const usePresentations = () => {
  return useQuery({
    queryKey: presentationKeys.all,
    queryFn: presentationsService.getAll,
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

// Create presentation with initial slides
export const useCreatePresentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ presentation }: { presentation: Presentation }) => {
      // Create presentation
      await presentationsService.create(presentation);

      // Create 3 initial slides with hardcoded XML layouts
      const slides: Omit<Slide, "id">[] = [
        {
          presentationId: presentation.id,
          index: 0,
          content: "Title Slide",
          layout: getLayoutByType("title"),
        },
        {
          presentationId: presentation.id,
          index: 1,
          content: "Content Slide",
          layout: getLayoutByType("content"),
        },
        {
          presentationId: presentation.id,
          index: 2,
          content: "Chart Slide",
          layout: getLayoutByType("chart"),
        },
      ];

      await slidesService.createMany(slides);

      return presentation.id;
    },
    onSuccess: () => {
      // Invalidate presentations list
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
};

// Update presentation
export const useUpdatePresentation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Presentation, "id">>;
    }) => presentationsService.update(id, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific presentation and list
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
      // Delete all slides first
      await slidesService.deleteByPresentationId(id);
      // Then delete presentation
      await presentationsService.delete(id);
    },
    onSuccess: () => {
      // Invalidate presentations list
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
};
