import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiSavedItem } from "@/lib/api-types";

type SaveItemButtonProps = {
  type: ApiSavedItem["type"];
  referenceId: number;
  className?: string;
};

export default function SaveItemButton({ type, referenceId, className }: SaveItemButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: savedItems } = useQuery<ApiSavedItem[]>({
    queryKey: ["/api/saved-items"],
    enabled: !!user,
  });

  const savedItem = savedItems?.find((item) => item.type === type && item.referenceId === referenceId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in to save this item.");

      if (savedItem) {
        return apiRequest("DELETE", `/api/saved-items/${savedItem.id}`);
      }

      return apiRequest("POST", "/api/saved-items", { type, referenceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      toast({
        title: savedItem ? "Removed from saved items" : "Saved",
        description: savedItem ? "This item was removed from your dashboard." : "This item is now saved to your dashboard.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : savedItem ? (
        <BookmarkCheck className="mr-2 h-4 w-4" />
      ) : (
        <Bookmark className="mr-2 h-4 w-4" />
      )}
      {savedItem ? "Saved to dashboard" : "Save for later"}
    </Button>
  );
}
