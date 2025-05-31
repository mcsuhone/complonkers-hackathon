import { useQuery } from "@tanstack/react-query";
import { layoutsService } from "@/db";

export const layoutKeys = {
  bySlideId: (slideId: string) => ["layouts", slideId] as const,
};

export function useLayout(slideId: string) {
  return useQuery({
    queryKey: layoutKeys.bySlideId(slideId),
    queryFn: () => layoutsService.getBySlideId(slideId),
    enabled: !!slideId,
  });
}
