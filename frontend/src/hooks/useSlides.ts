import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { slidesService } from "@/db";
import type { Slide } from "@/db";
import { getRandomLayout } from "@/data/slideLayouts";

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
      // If no layout is provided, use a random one
      const slideWithLayout = {
        ...slide,
        layout: slide.layout || getRandomLayout(),
      };
      return slidesService.create(slideWithLayout);
    },
    onSuccess: (_, slide) => {
      // Invalidate slides for this presentation
      queryClient.invalidateQueries({
        queryKey: slideKeys.byPresentation(slide.presentationId),
      });
    },
  });
};

// Update component content
export const useUpdateComponentContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      componentId,
      content,
    }: {
      id: number;
      componentId: string;
      content: string;
    }) => slidesService.updateComponentContent(id, componentId, content),
    onSuccess: (_, { id }) => {
      // Invalidate specific slide
      queryClient.invalidateQueries({ queryKey: slideKeys.detail(id) });
      // Also invalidate all slides queries to update the list
      queryClient.invalidateQueries({ queryKey: slideKeys.all });
    },
  });
};

// Update multiple component contents
export const useUpdateComponentContents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      componentContent,
    }: {
      id: number;
      componentContent: Record<string, string>;
    }) => slidesService.updateComponentContents(id, componentContent),
    onSuccess: (_, { id }) => {
      // Invalidate specific slide
      queryClient.invalidateQueries({ queryKey: slideKeys.detail(id) });
      // Also invalidate all slides queries to update the list
      queryClient.invalidateQueries({ queryKey: slideKeys.all });
    },
  });
};

// Update slide layout
export const useUpdateSlideLayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, layout }: { id: number; layout: string }) =>
      slidesService.updateLayout(id, layout),
    onSuccess: (_, { id }) => {
      // Invalidate specific slide
      queryClient.invalidateQueries({ queryKey: slideKeys.detail(id) });
      // Also invalidate all slides queries to update the list
      queryClient.invalidateQueries({ queryKey: slideKeys.all });
    },
  });
};

// Update slide (both component content and layout)
export const useUpdateSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: { componentContent?: Record<string, string>; layout?: string };
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
