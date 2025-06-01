import { useEffect, useState, useRef } from "react";
import { slidesService } from "@/db";
import { useQueryClient } from "@tanstack/react-query";
import { slideKeys } from "@/hooks/useSlides";
import { parseSlideIdeasXml, parseSlide } from "@/lib/xmlParsers";
import type { SlideIdea } from "@/lib/xmlParsers";

const cleanXml = (xml: string) => {
  // Remove code fence markers and any whitespace
  return xml
    .replace(/```xml\s*/g, "")
    .replace(/```\s*/g, "")
    .replace(/\n/g, "")
    .trim();
};

// Slugify function to create a URL-friendly string from a title
const slugify = (text: string): string => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
};

/**
 * Hook to listen to SSE events for a given jobId.
 */
export function useJobEvents(jobId: string) {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<any[]>([]);
  const slugToUuidMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!jobId) return;
    slugToUuidMapRef.current = new Map(); // Reset map for a new jobId
    const eventSource = new EventSource(
      `http://localhost:8000/api/events/${jobId}`
    );

    eventSource.onmessage = async (e) => {
      const text = cleanXml(e.data);
      console.log("Debug: Cleaned XML:", text);

      if (text.trim().includes("<SlideIdeas")) {
        const ideas = parseSlideIdeasXml(text);
        console.log("Debug: Parsed SlideIdeas count:", ideas.length);

        const newMap = new Map<string, string>();
        ideas.forEach((idea) => {
          const slug = slugify(idea.title);
          if (idea.slideId && slug) {
            newMap.set(slug, idea.slideId);
          } else {
            console.warn(
              `Debug: Missing slideId or unable to generate slug for title: "${idea.title}"`
            );
          }
        });
        slugToUuidMapRef.current = newMap;
        console.log("Debug: Built slugToUuidMap:", slugToUuidMapRef.current);

        // Replace slides for this presentation (using UUIDs from ideas)
        await slidesService.deleteByPresentationId(jobId);
        const ideaSlides = ideas.map((idea, idx) => ({
          presentationId: jobId,
          index: idx,
          slideId: idea.slideId, // This is the UUID, used for DB storage
          notes_title: idea.title,
          notes_contentDescription: idea.contentDescription,
          notes_dataInsights: idea.dataInsights,
        }));
        console.log("Debug: Idea Slides (to be created):", ideaSlides);
        await slidesService.createMany(ideaSlides);
        console.log("Debug: Inserted SlideIdeas into DB");
        queryClient.invalidateQueries({
          queryKey: slideKeys.byPresentation(jobId),
        });
      } else if (
        text.trim().includes("<Slide") ||
        text.trim().includes("<SlideDeck")
      ) {
        try {
          const parsedSlidesFromXml = parseSlide(text); // Contains slug-like ID in slide.slideId
          console.log(
            "Debug: Parsed slides from XML count:",
            parsedSlidesFromXml.length
          );

          const updatePromises = parsedSlidesFromXml.map((parsedSlide) => {
            const slugFromAttribute = parsedSlide.slideId; // e.g., "music-consumption-overview"

            // Attempt to find a direct match for the slug in the map
            let canonicalUuid = slugToUuidMapRef.current.get(slugFromAttribute);

            // If direct match fails, try to find a key in the map that is a SUBSTRING of slugFromAttribute
            // This is a fallback for cases like "slide1" vs a slugified title.
            // User accepts data loss, so this heuristic might be acceptable.
            if (!canonicalUuid && slugToUuidMapRef.current.size > 0) {
              for (const [key, value] of slugToUuidMapRef.current.entries()) {
                if (
                  slugFromAttribute.includes(key) ||
                  key.includes(slugFromAttribute)
                ) {
                  canonicalUuid = value;
                  console.warn(
                    `Debug: Used fuzzy match for slug: "${slugFromAttribute}" with map key: "${key}" to get UUID: ${canonicalUuid}`
                  );
                  break;
                }
              }
            }

            if (canonicalUuid) {
              console.log(
                `Debug: Updating slide. Slug from XML: "${slugFromAttribute}", Mapped UUID: "${canonicalUuid}"`
              );
              // console.log("Debug: Slide XML for update:", parsedSlide.xml);
              return slidesService.updateXmlBySlideId(
                jobId,
                canonicalUuid, // Use the mapped UUID
                parsedSlide.xml
              );
            } else {
              console.warn(
                `Debug: No UUID mapping found for slug: "${slugFromAttribute}". Slide XML content will not be updated. Map size: ${slugToUuidMapRef.current.size}`,
                slugToUuidMapRef.current
              );
              return Promise.resolve(); // Do not attempt to update if no mapping
            }
          });

          await Promise.all(updatePromises);
          console.log(
            "Debug: Finished attempting slide XML updates for presentation:",
            jobId
          );
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
  }, [jobId, queryClient]); // Added queryClient to dependencies

  return events;
}
