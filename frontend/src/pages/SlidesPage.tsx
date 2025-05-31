import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlideRenderer } from "@/components/SlideRenderer";
import { useSlides } from "@/hooks/useSlides";
import { usePresentation } from "@/hooks/usePresentations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Edit,
  ArrowLeft,
  Maximize,
  Loader2,
} from "lucide-react";
import { useJobEvents } from "@/hooks/useJobEvents";

export const SlidesPage: React.FC = () => {
  const { presentationId } = useParams<{ presentationId: string }>();
  const events = useJobEvents(presentationId || "");
  const navigate = useNavigate();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPresentation, setIsPresentation] = useState(false);

  const {
    data: presentation,
    isLoading: presentationLoading,
    error: presentationError,
  } = usePresentation(presentationId || "");

  const {
    data: slides = [],
    isLoading: slidesLoading,
    error: slidesError,
  } = useSlides(presentationId || "");

  const currentSlide = slides[currentSlideIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && currentSlideIndex > 0) {
        setCurrentSlideIndex(currentSlideIndex - 1);
      } else if (
        event.key === "ArrowRight" &&
        currentSlideIndex < slides.length - 1
      ) {
        setCurrentSlideIndex(currentSlideIndex + 1);
      } else if (event.key === "Escape") {
        setIsPresentation(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentSlideIndex, slides.length]);

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const togglePresentation = () => {
    setIsPresentation(!isPresentation);
  };

  if (presentationError || slidesError || !presentation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">⚠️</div>
          <div className="text-sm text-muted-foreground">
            {presentationError?.message ||
              slidesError?.message ||
              "Presentation not found"}
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Presentation mode (fullscreen)
  if (isPresentation) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Slide Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full h-full max-w-7xl border rounded-lg overflow-hidden bg-white">
            {currentSlide && (
              <SlideRenderer xml={currentSlide.xml} className="w-full h-full" />
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="bg-black/80 p-4 flex justify-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="text-white hover:bg-white/20"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode (normal view)
  return (
    <div className="min-h-screen bg-background">
      {/* Event banner */}
      {events.length > 0 && (
        <div className="bg-yellow-100 text-yellow-800 p-2 text-center">
          Event: {JSON.stringify(events[events.length - 1])}
        </div>
      )}
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 py-8">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-md font-semibold">
                  {presentation.prompt.split(".")[0] || "Untitled Presentation"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {slides.length} slide{slides.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={togglePresentation}>
                <Play className="w-4 h-4 mr-2" />
                Present
              </Button>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto p-4 grid grid-cols-[1fr_4fr_1fr] gap-4">
        {/* Slide Thumbnails */}
        <div className="lg:col-span-1">
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground mb-3">
              Slides
            </h3>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-2 p-2">
              {slides.map((slide, index) => (
                <Card
                  key={slide.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    index === currentSlideIndex
                      ? "ring-2 ring-primary shadow-md"
                      : ""
                  }`}
                  onClick={() => setCurrentSlideIndex(index)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-video bg-white rounded mb-2 overflow-hidden">
                      <div className="transform scale-[0.2] origin-top-left w-[500%] h-[500%]">
                        <SlideRenderer
                          xml={slide.xml}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Slide {index + 1}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Main Slide View */}
        <Card className="h-fit">
          <CardContent>
            {/* Slide Content and Notes */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Slide panel */}
              <div className="flex-1 overflow-hidden">
                <div className="aspect-video rounded-lg overflow-hidden">
                  {presentationLoading ||
                    (slidesLoading && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-muted-foreground text-2xl animate-spin">
                          <Loader2 className="w-10 h-10" />
                        </div>
                      </div>
                    ))}
                  {slides.length > 0 && currentSlide && (
                    <SlideRenderer
                      xml={currentSlide.xml}
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            {/* Notes panel */}
            {slides.length > 0 && currentSlide && (
              <div className="w-full border rounded-lg bg-gray-900 p-4 flex flex-col">
                <h3 className="text-sm font-medium mb-2 text-white">Notes</h3>
                <p className="font-semibold mb-1 text-white">
                  {currentSlide.notes_title}
                </p>
                <p className="text-sm mb-1 text-white">
                  {currentSlide.notes_contentDescription}
                </p>
                <p className="text-sm text-white">
                  {currentSlide.notes_dataInsights}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
