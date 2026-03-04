import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useCollections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myCollections, isLoading } = useQuery({
    queryKey: ["my-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections" as any)
        .select("*, collection_items(count)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const createCollection = useMutation({
    mutationFn: async ({ name, description, isPublic }: { name: string; description?: string; isPublic?: boolean }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("collections" as any)
        .insert({ user_id: user!.id, name, description, is_public: isPublic ?? true, slug })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-collections", user?.id] });
      toast({ title: "Đã tạo collection!" });
    },
    onError: (e: any) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const addToCollection = useMutation({
    mutationFn: async ({ collectionId, toolId, note }: { collectionId: string; toolId: string; note?: string }) => {
      const { error } = await supabase
        .from("collection_items" as any)
        .insert({ collection_id: collectionId, tool_id: toolId, note });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      toast({ title: "Đã thêm vào collection!" });
    },
    onError: (e: any) => toast({ title: "Đã có trong collection", variant: "destructive" }),
  });

  const removeFromCollection = useMutation({
    mutationFn: async ({ collectionId, toolId }: { collectionId: string; toolId: string }) => {
      await supabase
        .from("collection_items" as any)
        .delete()
        .eq("collection_id", collectionId)
        .eq("tool_id", toolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      toast({ title: "Đã xóa khỏi collection" });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("collections" as any).delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-collections", user?.id] });
      toast({ title: "Đã xóa collection" });
    },
  });

  return {
    myCollections: myCollections || [],
    isLoading,
    createCollection: createCollection.mutate,
    addToCollection: addToCollection.mutate,
    removeFromCollection: removeFromCollection.mutate,
    deleteCollection: deleteCollection.mutate,
  };
}
