import { useEffect, useState } from "react";
import { slidesService } from "@/db";
import { useQueryClient } from "@tanstack/react-query";
import { slideKeys } from "@/hooks/useSlides";
import { parseSlideIdeasXml, parseSlide } from "@/lib/xmlParsers";

const cleanXml = (xml: string) => {
  // Remove code fence markers and any whitespace
  return xml
    .replace(/```xml\s*/g, "")
    .replace(/```\s*/g, "")
    .replace(/\n/g, "")
    .trim();
};

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
      const text = cleanXml(e.data);
      console.log("Debug: Cleaned XML:", text);
      // Detect SlideIdeas XML
      if (text.trim().includes("<SlideIdeas")) {
        // Parse and insert SlideIdeas
        const ideas = parseSlideIdeasXml(text);
        console.log("Debug: Parsed SlideIdeas count:", ideas.length);
        // Replace slides for this presentation
        await slidesService.deleteByPresentationId(jobId);
        const ideaSlides = ideas.map((idea, idx) => ({
          presentationId: jobId,
          index: idx,
          slideId: idea.slideId,
          notes_title: idea.title,
          notes_contentDescription: idea.contentDescription,
          notes_dataInsights: idea.dataInsights,
        }));
        console.log("Debug: Idea Slides:", ideaSlides);
        await slidesService.createMany(ideaSlides);
        console.log("Debug: Inserted SlideIdeas into DB");
        queryClient.invalidateQueries({
          queryKey: slideKeys.byPresentation(jobId),
        });
      } else if (text.trim().includes("<Slide")) {
        // Process Slide, Presentation, or SlideDeck XML and update slides with content
        try {
          const slides = parseSlide(text);
          console.log("Debug: Parsed slides count:", slides.length);
          // Update slide xml content for each slide
          await Promise.all(
            slides.map((slide) => {
              console.log("Debug: Slide:", slide);
              console.log("Debug: Slide XML:", slide.xml);
              console.log("Debug: Slide ID:", slide.slideId);
              slidesService.updateXmlBySlideId(jobId, slide.slideId, slide.xml);
            })
          );
          console.log("Debug: Updated slide XML for presentation:", jobId);
          // Invalidate slides data for this presentation
          queryClient.invalidateQueries({
            queryKey: slideKeys.byPresentation(jobId),
          });
        } catch (err) {
          console.error(
            "Error processing Slide, Presentation, or SlideDeck XML:",
            err
          );
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
