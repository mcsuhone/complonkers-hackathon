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
    mutationFn: async ({
      prompt,
      audiences,
    }: {
      prompt: string;
      audiences: string[];
    }) => {
      try {
        console.log(
          "Starting job creation for presentation:",
          prompt,
          audiences
        );
        // Call backend to create job and get jobId
        const response = await fetch("http://localhost:8000/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, audiences }),
        });
        if (!response.ok) {
          throw new Error(`Failed to create job: ${response.statusText}`);
        }
        const { jobId } = await response.json();
        // Build presentation object with jobId
        const presentation: Presentation = {
          id: jobId,
          prompt,
          audiences,
          createdAt: new Date(),
        };
        console.log("Saving presentation locally:", presentation);

        // 1. Create presentation in Dexie
        await presentationsService.create(presentation);
        console.log("Presentation created successfully");

        // 2. Create unique template data for this presentation
        console.log("Creating unique template data...");

        // Helper function to update XML references
        const updateXmlReferences = (xml: string, presentationId: string) => {
          let updatedXml = xml;

          // Update chartId references
          templateCharts.forEach((chart) => {
            const oldId = chart.id;
            const newId = `${presentationId}-${oldId}`;
            updatedXml = updatedXml.replace(
              new RegExp(`chartId="${oldId}"`, "g"),
              `chartId="${newId}"`
            );
          });

          // Update textId references
          templateTextComponents.forEach((textComp) => {
            const oldId = textComp.id;
            const newId = `${presentationId}-${oldId}`;
            updatedXml = updatedXml.replace(
              new RegExp(`textId="${oldId}"`, "g"),
              `textId="${newId}"`
            );
          });

          return updatedXml;
        };

        const uniqueLayouts = templateLayouts.map((layout) => ({
          ...layout,
          id: `${presentation.id}-${layout.id}`,
          xml: updateXmlReferences(layout.xml, presentation.id),
        }));

        const uniqueCharts = templateCharts.map((chart) => ({
          ...chart,
          id: `${presentation.id}-${chart.id}`,
        }));

        const uniqueTextComponents = templateTextComponents.map((textComp) => ({
          ...textComp,
          id: `${presentation.id}-${textComp.id}`,
        }));

        await Promise.all([
          layoutsService.createMany(uniqueLayouts),
          chartsService.createMany(uniqueCharts),
          textComponentsService.createMany(uniqueTextComponents),
        ]);
        console.log("Template data seeded successfully");

        // 3. Create slides with layoutId references (using unique layout IDs)
        const slides: Omit<Slide, "id">[] = templateSlides.map(
          (slideTemplate) => ({
            presentationId: presentation.id,
            index: slideTemplate.index,
            layoutId: `${presentation.id}-${slideTemplate.layoutId}`,
          })
        );
        console.log("Creating slides:", slides);

        await Promise.all(slides.map((slide) => slidesService.create(slide)));
        console.log("Slides created successfully");

        return presentation;
      } catch (error) {
        console.error("Error in useCreatePresentation:", error);
        throw error;
      }
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
