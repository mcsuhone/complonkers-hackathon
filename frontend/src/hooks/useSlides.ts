import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { slidesService } from "@/db";
import type { Slide } from "@/db";

// Query keys
export const slideKeys = {
  all: ["slides"] as const,
  byPresentation: (presentationId: string) =>
    ["slides", "presentation", presentationId] as const,
  detail: (id: number) => ["slides", id] as const,
};

// Get slides by presentation ID
export const useSlides = (presentationId: string) => {
  return useQuery({
    queryKey: slideKeys.byPresentation(presentationId),
    queryFn: () => slidesService.getByPresentationId(presentationId),
    enabled: !!presentationId,
  });
};

// Get slide by ID
export const useSlide = (id: number) => {
  return useQuery({
    queryKey: slideKeys.detail(id),
    queryFn: () => slidesService.getById(id),
    enabled: !!id,
  });
};

// Create slide
export const useCreateSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slide: Omit<Slide, "id">) => {
      return slidesService.create(slide);
    },
    onSuccess: (_, slide) => {
      // Invalidate slides for this presentation
      queryClient.invalidateQueries({
        queryKey: slideKeys.byPresentation(slide.presentationId),
      });
    },
  });
};

// Update slide
export const useUpdateSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: { xml?: string; index?: number };
    }) => slidesService.updateSlide(id, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific slide
      queryClient.invalidateQueries({ queryKey: slideKeys.detail(id) });
      // Also invalidate all slides queries to update the list
      queryClient.invalidateQueries({ queryKey: slideKeys.all });
    },
  });
};

// Delete slide
export const useDeleteSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      slideId,
      presentationId,
    }: {
      slideId: number;
      presentationId: string;
    }) => slidesService.delete(slideId, presentationId),
    onSuccess: (_, { presentationId }) => {
      // Invalidate slides for this presentation
      queryClient.invalidateQueries({
        queryKey: slideKeys.byPresentation(presentationId),
      });
    },
  });
};
