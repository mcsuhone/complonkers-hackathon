import React, { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import db from "../db";
import type { Presentation, Slide } from "../db";

export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const [audienceInput, setAudienceInput] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);

  const navigate = useNavigate();

  const handleAddAudience = () => {
    const trimmed = audienceInput.trim();
    if (trimmed && !audiences.includes(trimmed)) {
      setAudiences([...audiences, trimmed]);
      setAudienceInput("");
    }
  };

  const handleRemoveAudience = (index: number) => {
    setAudiences(audiences.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (audiences.length === 0) return;
    const id = crypto.randomUUID();
    const presentation: Presentation = {
      id,
      prompt,
      audiences,
      createdAt: new Date(),
    };
    await db.presentations.add(presentation);
    const slidesToAdd: Slide[] = [];
    for (let i = 0; i < 5; i++) {
      slidesToAdd.push({
        presentationId: id,
        index: i,
        content: `Slide ${i + 1}`,
      });
    }
    await db.slides.bulkAdd(slidesToAdd);
    navigate(`/slides/${id}`);
  };

  return (
    <div className="p-4 flex-grow overflow-y-auto">
      <h1 className="text-2xl font-bold mb-4">Create a New Presentation</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
        <div>
          <label className="block mb-1 font-medium">Initial Prompt</label>
          <textarea
            className="w-full border rounded p-2"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Audience Tags</label>
          <div className="flex flex-wrap gap-2">
            {audiences.map((aud, idx) => (
              <div
                key={idx}
                className="flex items-center bg-gray-200 rounded px-2 py-1"
              >
                <span>{aud}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAudience(idx)}
                  className="ml-1"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex">
            <input
              className="flex-grow border rounded-l p-2"
              value={audienceInput}
              onChange={(e) => setAudienceInput(e.target.value)}
              placeholder="Add audience"
            />
            <button
              type="button"
              onClick={handleAddAudience}
              className="bg-blue-500 text-white px-3 rounded-r"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={audiences.length === 0}
          className={`mt-4 px-4 py-2 text-white rounded ${
            audiences.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600"
          }`}
        >
          Create Presentation
        </button>
      </form>
    </div>
  );
}
