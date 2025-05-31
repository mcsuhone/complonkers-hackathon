import { useEffect, useState } from "react";
import { slidesService, layoutsService } from "@/db";
import { useQueryClient } from "@tanstack/react-query";
import { slideKeys } from "@/hooks/useSlides";
import { layoutKeys } from "@/hooks/useLayouts";
import { parseSlideIdeasXml, parseSlideLayoutsXml } from "@/lib/xmlParsers";

/**
 * Hook to listen to SSE events for a given jobId.
 */
export function useJobEvents(jobId: string) {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!jobId) return;
    const eventSource = new EventSource(
      `http://localhost:8000/api/events/${jobId}`
    );

    eventSource.onmessage = async (e) => {
      const text = e.data;
      console.log("useJobEvents EventSource message:", text);
      // Unwrap JSON-quoted payload if necessary
      let payload = text;
      if (
        (payload.startsWith('"') && payload.endsWith('"')) ||
        (payload.startsWith("'") && payload.endsWith("'"))
      ) {
        try {
          payload = JSON.parse(payload);
          console.log("Debug: Unwrapped payload:", payload);
        } catch (err) {
          console.warn("Debug: Failed to unwrap payload, using raw text", err);
        }
      }
      // Detect SlideIdeas XML
      if (payload.trim().startsWith("<SlideIdeas")) {
        // Parse and insert SlideIdeas
        const ideas = parseSlideIdeasXml(payload);
        console.log("Debug: Parsed SlideIdeas count:", ideas.length);
        // Replace slides for this presentation
        await slidesService.deleteByPresentationId(jobId);
        console.log("Debug: Cleared slides for presentation:", jobId);
        const ideaSlides = ideas.map((idea, idx) => ({
          presentationId: jobId,
          index: idx,
          slideId: idea.slideId,
          title: idea.title,
          contentDescription: idea.contentDescription,
          dataInsights: idea.dataInsights,
        }));
        await slidesService.createMany(ideaSlides);
        console.log("Debug: Inserted SlideIdeas into DB");
        queryClient.invalidateQueries({
          queryKey: slideKeys.byPresentation(jobId),
        });
      } else if (payload.trim().startsWith("<SlideDeck")) {
        // Process SlideDeck (layout) XML
        try {
          const layouts = parseSlideLayoutsXml(payload);
          console.log("Debug: Parsed SlideDeck layouts count:", layouts.length);
          // Insert layouts
          const layoutRecords = layouts.map((l) => ({
            id: l.slideId,
            slideId: l.slideId,
            name: l.slideId,
            xml: l.xml,
            createdAt: new Date(),
          }));
          await layoutsService.createMany(layoutRecords);
          console.log("Debug: Inserted layouts into DB");
          // Invalidate for each slideId
          layouts.forEach((l) => {
            queryClient.invalidateQueries({
              queryKey: layoutKeys.bySlideId(l.slideId),
            });
          });
        } catch (err) {
          console.error("Error processing SlideDeck XML:", err);
        }
      } else {
        // Keep other events for debugging
        try {
          const data = JSON.parse(payload);
          setEvents((prev) => [...prev, data]);
        } catch {
          setEvents((prev) => [...prev, payload]);
        }
      }
    };

    eventSource.onerror = (err) => {
      console.error("useJobEvents EventSource error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return events;
}
