import React, { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash, Presentation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreatePresentation } from "@/hooks/usePresentations";
import type { Presentation as PresentationType } from "@/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const [audienceInput, setAudienceInput] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);

  const navigate = useNavigate();
  const createPresentationMutation = useCreatePresentation();

  const handleAddAudience = () => {
    const trimmed = audienceInput.trim();
    if (trimmed && !audiences.includes(trimmed)) {
      setAudiences([...audiences, trimmed]);
      setAudienceInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddAudience();
    }
  };

  const handleRemoveAudience = (index: number) => {
    setAudiences(audiences.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (audiences.length === 0 || !prompt.trim()) return;

    const presentation: PresentationType = {
      id: crypto.randomUUID(),
      prompt: prompt.trim(),
      audiences,
      createdAt: new Date(),
    };

    try {
      const presentationId = await createPresentationMutation.mutateAsync({
        presentation,
        initialSlides: 5,
      });
      navigate(`/slides/${presentationId}`);
    } catch (error) {
      console.error("Error creating presentation:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Presentation className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Create Your Presentation
          </h1>
          <p className="text-muted-foreground text-lg">
            Build compelling presentations tailored to your audience
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Presentation Details</CardTitle>
            <CardDescription>
              Provide your initial prompt and target audiences to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt">Initial Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe what you want to present about..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] resize-none"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Target Audiences</Label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                  {audiences.length === 0 ? (
                    <span className="text-muted-foreground text-sm">
                      Add at least one audience tag
                    </span>
                  ) : (
                    audiences.map((aud, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                      >
                        <span>{aud}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAudience(idx)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Investors, Employees, Board Members"
                    value={audienceInput}
                    onChange={(e) => setAudienceInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-grow"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleAddAudience}
                    disabled={!audienceInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  audiences.length === 0 ||
                  !prompt.trim() ||
                  createPresentationMutation.isPending
                }
                className="w-full"
                size="lg"
              >
                {createPresentationMutation.isPending
                  ? "Creating..."
                  : "Create Presentation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
