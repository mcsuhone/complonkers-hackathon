import { useEffect, useState } from "react";
import { slidesService } from "@/db";
import { useQueryClient } from "@tanstack/react-query";
import { slideKeys } from "@/hooks/useSlides";
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
      console.log(e);
      const text = e.data;
      console.log(text);
      console.log(text);
      // Detect SlideIdeas XML
      if (text.trim().startsWith("<SlideIdeas")) {
        // Parse and insert SlideIdeas
        const ideas = parseSlideIdeasXml(text);
        console.log("Debug: Parsed SlideIdeas count:", ideas.length);
        // Replace slides for this presentation
        await slidesService.deleteByPresentationId(jobId);
        console.log("Debug: Cleared slides for presentation:", jobId);
        const ideaSlides = ideas.map((idea, idx) => ({
          presentationId: jobId,
          index: idx,
          slideId: idea.slideId,
          notes_title: idea.title,
          notes_contentDescription: idea.contentDescription,
          notes_dataInsights: idea.dataInsights,
        }));
        await slidesService.createMany(ideaSlides);
        console.log("Debug: Inserted SlideIdeas into DB");
        queryClient.invalidateQueries({
          queryKey: slideKeys.byPresentation(jobId),
        });
      } else if (text.trim().startsWith("<SlideDeck")) {
        // Process SlideDeck XML and update slides with content
        try {
          const layouts = parseSlideLayoutsXml(text);
          console.log("Debug: Parsed SlideDeck layouts count:", layouts.length);
          // Update slide xml content for each slide
          await Promise.all(
            layouts.map((l) =>
              slidesService.updateXmlBySlideId(jobId, l.slideId, l.xml)
            )
          );
          console.log("Debug: Updated slide XML for presentation:", jobId);
          // Invalidate slides data for this presentation
          queryClient.invalidateQueries({
            queryKey: slideKeys.byPresentation(jobId),
          });
        } catch (err) {
          console.error("Error processing SlideDeck XML:", err);
        }
      } else {
        // Keep other events for debugging
        try {
          const data = JSON.parse(text);
          setEvents((prev) => [...prev, data]);
        } catch {
          setEvents((prev) => [...prev, text]);
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
