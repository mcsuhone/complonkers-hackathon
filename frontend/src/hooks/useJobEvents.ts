import { useEffect, useState } from "react";
import { slidesService } from "@/db";
import { useQueryClient } from "@tanstack/react-query";
import { slideKeys } from "@/hooks/useSlides";

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
        // Process slide ideas XML
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(payload, "application/xml");
          const namespace = "http://www.complonkers-hackathon/slide_ideas";
          // Collect all SlideIdea elements in the slide_ideas namespace
          let slideIdeaElems = Array.from(
            xmlDoc.getElementsByTagNameNS(namespace, "SlideIdea")
          );
          // Fallback to non-namespace search if none found
          if (slideIdeaElems.length === 0) {
            slideIdeaElems = Array.from(
              xmlDoc.getElementsByTagName("SlideIdea")
            );
          }
          console.log(
            "Debug: Parsed SlideIdea elements count:",
            slideIdeaElems.length
          );
          // Replace slides for this presentation
          console.log(
            "Debug: Deleting existing slides for presentation:",
            jobId
          );
          await slidesService.deleteByPresentationId(jobId);
          console.log(
            "Debug: Deleted existing slides for presentation:",
            jobId
          );
          const newSlides = slideIdeaElems.map((el, idx) => ({
            presentationId: jobId,
            index: idx,
            layoutId: "",
            slideId: el.querySelector("SlideId")?.textContent || "",
            title: el.querySelector("Title")?.textContent || "",
            contentDescription:
              el.querySelector("ContentDescription")?.textContent || "",
            dataInsights: el.querySelector("DataInsights")?.textContent || "",
          }));
          console.log("Debug: Prepared newSlides to insert:", newSlides);
          await slidesService.createMany(newSlides);
          console.log("Debug: Successfully inserted newSlides into IndexedDB");
          // Trigger refetch of slides for this presentation
          queryClient.invalidateQueries({
            queryKey: slideKeys.byPresentation(jobId),
          });
        } catch (err) {
          console.error("Error processing SlideIdeas XML:", err);
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
