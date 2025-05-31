import React, { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash, Presentation, Eye, Calendar, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useCreatePresentation,
  usePresentations,
  useDeletePresentation,
} from "@/hooks/usePresentations";
import type { Presentation as PresentationType } from "@/db";
import db from "@/db/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const [audienceInput, setAudienceInput] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);

  const navigate = useNavigate();
  const createPresentationMutation = useCreatePresentation();
  const {
    data: presentations = [],
    isLoading: presentationsLoading,
    refetch: refetchPresentations,
  } = usePresentations();
  const deletePresentationMutation = useDeletePresentation();

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

    console.log("Submitting presentation:", presentation);

    try {
      const result = await createPresentationMutation.mutateAsync({
        presentation,
      });
      console.log("Mutation result:", result);
      // The mutation returns the presentation object, so we use result.id
      console.log("Navigating to:", `/slides/${result.id}`);
      navigate(`/slides/${result.id}`);
    } catch (error) {
      console.error("Error creating presentation:", error);
      // Show user-friendly error message
      alert("Failed to create presentation. Please try again.");
    }
  };

  const handleDeletePresentation = async (id: string) => {
    if (confirm("Are you sure you want to delete this presentation?")) {
      try {
        await deletePresentationMutation.mutateAsync(id);
        console.log("Presentation deleted:", id);
      } catch (error) {
        console.error("Error deleting presentation:", error);
        alert("Failed to delete presentation. Please try again.");
      }
    }
  };

  const handleDeleteAllPresentations = async () => {
    if (
      confirm(
        "Are you sure you want to delete ALL presentations? This cannot be undone!"
      )
    ) {
      try {
        await Promise.all(
          presentations.map((p) => deletePresentationMutation.mutateAsync(p.id))
        );
        console.log("All presentations deleted successfully");
        refetchPresentations();
        alert("All presentations deleted successfully!");
      } catch (error) {
        console.error("Error deleting all presentations:", error);
        alert("Failed to delete all presentations. Please try again.");
      }
    }
  };

  const handleViewPresentation = (id: string) => {
    navigate(`/slides/${id}`);
  };

  const handleInspectDatabase = async () => {
    try {
      console.log("=== DATABASE INSPECTION ===");

      const presentations = await db.presentations.toArray();
      console.log("Presentations:", presentations);

      const slides = await db.slides.toArray();
      console.log("Slides:", slides);

      const layouts = await db.layouts.toArray();
      console.log("Layouts:", layouts);

      const charts = await db.charts.toArray();
      console.log("Charts:", charts);

      const textComponents = await db.textComponents.toArray();
      console.log("Text Components:", textComponents);

      console.log("=== END DATABASE INSPECTION ===");
      alert("Database inspection complete! Check console for details.");
    } catch (error) {
      console.error("Database inspection failed:", error);
      alert("Database inspection failed! Check console for details.");
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Presentation className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            AI-Powered Presentation Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Build compelling presentations tailored to your audience
          </p>
        </div>

        {/* Create New Presentation */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle>Create New Presentation</CardTitle>
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
                {audiences.length !== 0 && (
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                    {audiences.map((aud, idx) => (
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
                    ))}
                  </div>
                )}

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
                className="w-full text-white"
                size="lg"
              >
                {createPresentationMutation.isPending
                  ? "Creating..."
                  : "Create Presentation"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Presentations */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Existing Presentations
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{presentations.length} total</Badge>
                {presentations.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAllPresentations}
                    disabled={deletePresentationMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete All
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInspectDatabase}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Inspect DB
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              View, manage, or delete your existing presentations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {presentationsLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  Loading presentations...
                </div>
              </div>
            ) : presentations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">📄</div>
                <div className="text-sm text-muted-foreground">
                  No presentations yet. Create your first one!
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {presentations.map((presentation) => (
                  <div
                    key={presentation.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate mb-1">
                          {presentation.prompt}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {presentation.createdAt.toLocaleDateString()}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {presentation.audiences.map((audience, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {audience}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleViewPresentation(presentation.id)
                          }
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeletePresentation(presentation.id)
                          }
                          disabled={deletePresentationMutation.isPending}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
