import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  presentationsService,
  slidesService,
  layoutsService,
  chartsService,
  textComponentsService,
} from "@/db";
import type { Presentation, Slide } from "@/db";

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
    mutationFn: async ({
      prompt,
      audiences,
    }: {
      prompt: string;
      audiences: string[];
    }) => {
      // Call backend to start job
      const response = await fetch("http://localhost:8000/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, audiences }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create job: ${response.statusText}`);
      }
      const { jobId } = await response.json();
      // Build and store presentation record
      const presentation: Presentation = {
        id: jobId,
        prompt,
        audiences,
        createdAt: new Date(),
      };
      await presentationsService.create(presentation);
      return presentation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
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
