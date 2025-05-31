import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import db from "../db";
import type { Slide } from "../db";
import { Plus, Trash } from "lucide-react";

export default function SlidesPage() {
  const { slidesId } = useParams<{ slidesId: string }>();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);

  const loadSlides = async () => {
    if (!slidesId) return [] as Slide[];
    const arr = await db.slides
      .where("presentationId")
      .equals(slidesId)
      .toArray();
    arr.sort((a, b) => a.index - b.index);
    setSlides(arr);
    return arr;
  };

  useEffect(() => {
    (async () => {
      const arr = await loadSlides();
      if (arr.length > 0) {
        setCurrentIndex(0);
      }
    })();
  }, [slidesId]);

  const handleAddSlide = async () => {
    if (!slidesId) return;
    const newIndex =
      slides.length > 0 ? Math.max(...slides.map((s) => s.index)) + 1 : 0;
    const newSlide: Omit<Slide, "id"> = {
      presentationId: slidesId,
      index: newIndex,
      content: `Slide ${newIndex + 1}`,
    };
    await db.slides.add(newSlide);
    await loadSlides();
    setCurrentIndex(newIndex);
  };

  const handleDeleteSlide = async (slideToDelete: Slide) => {
    if (slideToDelete.id == null || !slidesId) return;
    const removedIndex = slideToDelete.index;
    await db.transaction("rw", db.slides, async () => {
      await db.slides.delete(slideToDelete.id!);
      const laterSlides = await db.slides
        .where("presentationId")
        .equals(slidesId)
        .and((s) => s.index > removedIndex)
        .toArray();
      await Promise.all(
        laterSlides.map((s) => db.slides.update(s.id!, { index: s.index - 1 }))
      );
    });
    const arr = await loadSlides();
    setCurrentIndex((prev) => {
      if (arr.length === 0) return 0;
      if (prev > removedIndex) return prev - 1;
      if (prev === removedIndex) return Math.min(removedIndex, arr.length - 1);
      return prev;
    });
  };

  const handleContentChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newContent = e.target.value;
    setSlides((prev) =>
      prev.map((s) =>
        s.index === currentIndex ? { ...s, content: newContent } : s
      )
    );
    const slide = slides.find((s) => s.index === currentIndex);
    if (slide?.id != null) {
      await db.slides.update(slide.id, { content: newContent });
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

  return (
    <>
      <div className="flex flex-col h-full flex-grow">
        <div className="p-4 flex justify-end">
          <button
            onClick={() => setIsPresenting(true)}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Present
          </button>
        </div>
        <div className="flex-grow flex min-h-0">
          <div className="w-1/4 p-4 border-r overflow-y-auto space-y-2">
            {slides.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-2 border rounded cursor-pointer ${
                  s.index === currentIndex ? "bg-blue-100" : ""
                }`}
                onClick={() => setCurrentIndex(s.index)}
              >
                <p className="text-sm truncate">{s.content}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSlide(s);
                  }}
                  className="text-red-500"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddSlide}
              className="flex items-center justify-center w-full p-2 text-blue-500 hover:bg-blue-100 rounded"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex-grow p-4 flex flex-col">
            {currentSlide ? (
              <textarea
                className="w-full flex-grow border rounded p-2 resize-none min-h-0"
                value={currentSlide.content}
                onChange={handleContentChange}
              />
            ) : (
              <div>No slides available</div>
            )}
          </div>
        </div>
      </div>

      {isPresenting && (
        <div
          className="fixed inset-0 bg-white z-50 flex items-center justify-center p-8 cursor-pointer"
          onClick={handleOverlayClick}
        >
          <div className="max-w-3xl">
            <p className="text-3xl">{currentSlide?.content}</p>
          </div>
        </div>
      )}
    </>
  );
}
