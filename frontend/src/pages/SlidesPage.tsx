import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  useSlides,
  useCreateSlide,
  useDeleteSlide,
  useUpdateSlideContent,
} from "@/hooks/useSlides";
import SlideRenderer from "@/components/SlideRenderer";
import type { Slide } from "@/db";

export default function SlidesPage() {
  const { slidesId } = useParams<{ slidesId: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);

  // React Query hooks
  const { data: slides = [], isLoading, error } = useSlides(slidesId || "");
  const createSlideMutation = useCreateSlide();
  const deleteSlideMutation = useDeleteSlide();
  const updateSlideContentMutation = useUpdateSlideContent();

  useEffect(() => {
    if (slides.length > 0 && currentIndex >= slides.length) {
      setCurrentIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentIndex]);

  const handleAddSlide = async () => {
    if (!slidesId) return;
    const newIndex =
      slides.length > 0 ? Math.max(...slides.map((s) => s.index)) + 1 : 0;
    const newSlide: Omit<Slide, "id"> = {
      presentationId: slidesId,
      index: newIndex,
      content: `Slide ${newIndex + 1}`,
      layout: "", // Will be filled with random layout by the hook
    };

    try {
      await createSlideMutation.mutateAsync(newSlide);
      setCurrentIndex(newIndex);
    } catch (error) {
      console.error("Error creating slide:", error);
    }
  };

  const handleDeleteSlide = async (slideToDelete: Slide) => {
    if (slideToDelete.id == null || !slidesId) return;

    try {
      await deleteSlideMutation.mutateAsync({
        slideId: slideToDelete.id,
        presentationId: slidesId,
      });

      // Adjust current index if needed
      const removedIndex = slideToDelete.index;
      setCurrentIndex((prev) => {
        if (slides.length <= 1) return 0;
        if (prev > removedIndex) return prev - 1;
        if (prev === removedIndex)
          return Math.min(removedIndex, slides.length - 2);
        return prev;
      });
    } catch (error) {
      console.error("Error deleting slide:", error);
    }
  };

  const handleContentChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newContent = e.target.value;
    const slide = slides.find((s) => s.index === currentIndex);

    if (slide?.id != null) {
      try {
        await updateSlideContentMutation.mutateAsync({
          id: slide.id,
          content: newContent,
        });
      } catch (error) {
        console.error("Error updating slide content:", error);
      }
    }
  };

  const currentSlide = slides.find((s) => s.index === currentIndex);

  useEffect(() => {
    if (!isPresenting) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (currentIndex < slides.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setIsPresenting(false);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      } else if (e.key === "Escape") {
        setIsPresenting(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [isPresenting, currentIndex, slides.length]);

  // Handle mouse clicks on overlay: click left half to go prev, right half to go next/exit
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX;
    const half = window.innerWidth / 2;
    if (x > half) {
      if (currentIndex < slides.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsPresenting(false);
      }
    } else {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading slides...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">
          Error loading slides: {error.message}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full flex-grow bg-background">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Presentation Editor</h1>
              <div className="text-sm text-muted-foreground">
                {slides.length} slide{slides.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))
                }
                disabled={currentIndex === slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsPresenting(true)}
                disabled={slides.length === 0}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Present
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-grow flex min-h-0">
          {/* Slide Thumbnails */}
          <div className="w-80 border-r bg-muted/30 p-4 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Slides
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSlide}
                  className="gap-1"
                  disabled={createSlideMutation.isPending}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>

              {slides.map((s, idx) => (
                <Card
                  key={s.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    s.index === currentIndex
                      ? "ring-2 ring-primary shadow-md"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => setCurrentIndex(s.index)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-grow min-w-0">
                        <div className="text-xs text-muted-foreground mb-2">
                          Slide {idx + 1}
                        </div>
                        {/* Render slide preview using SlideRenderer */}
                        <div className="h-20 overflow-hidden rounded border bg-background">
                          <div className="scale-[0.15] origin-top-left w-[533px] h-[400px]">
                            <SlideRenderer
                              layoutXml={s.layout}
                              content={s.content}
                              isPresentation={false}
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(s);
                        }}
                        disabled={deleteSlideMutation.isPending}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Main Editor */}
          <div className="flex-grow flex min-h-0">
            {currentSlide ? (
              <div className="flex w-full">
                {/* Slide Preview */}
                <div className="flex-1 p-6 border-r">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-1">
                      Slide {currentIndex + 1} Preview
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Live preview of your slide layout
                    </p>
                  </div>
                  <Card className="h-[500px] overflow-hidden">
                    <CardContent className="p-0 h-full">
                      <SlideRenderer
                        layoutXml={currentSlide.layout}
                        content={currentSlide.content}
                        isPresentation={false}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Content Editor */}
                <div className="w-80 p-6 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-1">Content Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Edit your slide content
                    </p>
                  </div>
                  <Card className="flex-grow flex flex-col">
                    <CardContent className="p-4 flex-grow flex flex-col">
                      <Textarea
                        value={currentSlide.content}
                        onChange={handleContentChange}
                        placeholder="Enter your slide content here..."
                        className="flex-grow resize-none min-h-0 text-base leading-relaxed"
                        disabled={updateSlideContentMutation.isPending}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <div className="text-center">
                  <div className="text-muted-foreground mb-4">
                    No slides available
                  </div>
                  <Button
                    onClick={handleAddSlide}
                    className="gap-2"
                    disabled={createSlideMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    Create your first slide
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Presentation Overlay */}
      {isPresenting && currentSlide && (
        <div
          className="fixed inset-0 bg-background z-50 flex items-center justify-center p-8 cursor-pointer"
          onClick={handleOverlayClick}
        >
          <div className="max-w-6xl w-full h-full flex items-center justify-center">
            <SlideRenderer
              layoutXml={currentSlide.layout}
              content={currentSlide.content}
              isPresentation={true}
            />
          </div>
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-muted-foreground text-sm bg-background/80 backdrop-blur px-4 py-2 rounded-full">
            <span>
              Slide {currentIndex + 1} of {slides.length}
            </span>
            <span>•</span>
            <span>Use ← → keys or click to navigate</span>
            <span>•</span>
            <span>Press ESC to exit</span>
          </div>
        </div>
      )}
    </>
  );
}
