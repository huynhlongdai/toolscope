import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CollectItem, CollectSession, CollectSchedule, Category } from "./types";

export function useCollectAI() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"keyword" | "url" | "text">("keyword");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [importCategory, setImportCategory] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("search");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSession, setFilterSession] = useState<string>("all");
  const [contentText, setContentText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemCategoryOverrides, setItemCategoryOverrides] = useState<Record<string, string>>({});
  const [bulkCollecting, setBulkCollecting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ total: number; keywords: number; results: any[] } | null>(null);

  // Schedule form state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    keyword: "",
    search_type: "keyword",
    category_id: "",
    cron_expression: "0 8 * * 1",
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["collect-stats"],
    queryFn: async () => {
      const [allItems, sessionsData] = await Promise.all([
        supabase.from("collect_items").select("status", { count: "exact", head: false }),
        supabase.from("collect_sessions").select("id", { count: "exact", head: true }),
      ]);
      const items = allItems.data || [];
      const total = items.length;
      const pending = items.filter((i: any) => i.status === "pending").length;
      const approved = items.filter((i: any) => i.status === "approved").length;
      const imported = items.filter((i: any) => i.status === "imported").length;
      const rejected = items.filter((i: any) => i.status === "rejected").length;
      return { total, pending, approved, imported, rejected, sessions: sessionsData.count || 0 };
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug").order("name");
      return (data || []) as Category[];
    },
  });

  // Fetch sessions history
  const { data: sessions = [] } = useQuery({
    queryKey: ["collect-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collect_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as CollectSession[];
    },
  });

  // Fetch staging items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["collect-items", filterStatus, filterSession],
    queryFn: async () => {
      let q = supabase.from("collect_items").select("*").order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      if (filterSession !== "all") q = q.eq("session_id", filterSession);
      const { data } = await q.limit(200);
      return (data || []) as CollectItem[];
    },
  });

  // Fetch schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ["collect-schedules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collect_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as CollectSchedule[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["collect-items"] });
    queryClient.invalidateQueries({ queryKey: ["collect-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["collect-stats"] });
  };

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async () => {
      if (searchType === "text") {
        const { data, error } = await supabase.functions.invoke("collect-ai", {
          body: { action: "parse-content", content_text: contentText, category_id: selectedCategory || undefined, category_name: categories.find(c => c.id === selectedCategory)?.name },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      }
      const catName = categories.find(c => c.id === selectedCategory)?.name;
      const { data, error } = await supabase.functions.invoke("collect-ai", {
        body: { action: "search", query: searchQuery, search_type: searchType, category_id: selectedCategory || undefined, category_name: catName || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const sourceLabel = data.data_source === "firecrawl" ? "Firecrawl" : data.data_source === "content_parse" ? "Nội dung" : "AI Fallback";
      toast.success(`Tìm thấy ${data.tools_count} công cụ (nguồn: ${sourceLabel})`);
      invalidateAll();
      setActiveTab("staging");
      setContentText("");
    },
    onError: (e: any) => toast.error(e.message || "Lỗi tìm kiếm"),
  });

  // File upload
  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
      const filePath = `${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage.from("collect-uploads").upload(filePath, file);
      if (uploadError) throw uploadError;

      const catName = categories.find(c => c.id === selectedCategory)?.name;
      const { data, error } = await supabase.functions.invoke("collect-ai", {
        body: { action: "parse-content", file_path: filePath, file_type: ext, category_id: selectedCategory || undefined, category_name: catName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Tìm thấy ${data.tools_count} công cụ từ file`);
      invalidateAll();
      setActiveTab("staging");
    } catch (e: any) {
      toast.error(e.message || "Lỗi upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Approve/Reject
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from("collect_items").update({ status, reviewed_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collect-items"] }); setSelectedItems(new Set()); toast.success("Cập nhật thành công"); },
  });

  // Import
  const importMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("collect-ai", {
        body: {
          action: "import",
          item_ids: itemIds,
          target_category_id: importCategory || undefined,
          item_category_overrides: itemCategoryOverrides,
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const imported = data.results?.filter((r: any) => r.status === "imported").length || 0;
      const dupes = data.results?.filter((r: any) => r.status === "duplicate").length || 0;
      toast.success(`Import: ${imported} thành công, ${dupes} trùng lặp`);
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
      setSelectedItems(new Set());
    },
    onError: (e: any) => toast.error(e.message || "Lỗi import"),
  });

  // Single enrich
  const enrichMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.functions.invoke("collect-ai", { body: { action: "enrich", item_id: itemId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collect-items"] }); toast.success("Đã làm giàu dữ liệu"); },
  });

  // Batch enrich
  const batchEnrichMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("collect-ai", { body: { action: "batch-enrich" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Đã enrich ${data.enriched_count}/${data.total} items`);
      if (data.errors?.length) toast.warning(`${data.errors.length} lỗi: ${data.errors[0]}`);
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
    },
    onError: (e: any) => toast.error(e.message || "Lỗi batch enrich"),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("collect_items").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collect-items"] }); setSelectedItems(new Set()); toast.success("Đã xóa"); },
  });

  // Create schedule
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("collect_schedules").insert({
        keyword: scheduleForm.keyword,
        search_type: scheduleForm.search_type,
        category_id: scheduleForm.category_id || null,
        cron_expression: scheduleForm.cron_expression,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collect-schedules"] });
      setScheduleDialogOpen(false);
      setScheduleForm({ keyword: "", search_type: "keyword", category_id: "", cron_expression: "0 8 * * 1" });
      toast.success("Đã tạo lịch thu thập");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle schedule active
  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("collect_schedules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collect-schedules"] }); toast.success("Đã cập nhật"); },
  });

  // Run schedule now
  const runScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data, error } = await supabase.functions.invoke("collect-ai", { body: { action: "run-schedule", schedule_id: scheduleId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Thu thập ${data.tools_count} tools`);
      queryClient.invalidateQueries({ queryKey: ["collect-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collect_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collect-schedules"] }); toast.success("Đã xóa lịch"); },
  });

  // Bulk collect
  const handleBulkCollect = async () => {
    setBulkCollecting(true);
    setBulkProgress(null);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-collect-tools", {
        body: { batch_size: 25 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBulkProgress({
        total: data.total_collected,
        keywords: data.keywords_processed,
        results: data.results || [],
      });
      toast.success(`Đã thu thập ${data.total_collected} tool thành công!`);
      invalidateAll();
    } catch (e: any) {
      toast.error("Lỗi thu thập hàng loạt: " + (e.message || "Unknown"));
    } finally {
      setBulkCollecting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    setSelectedItems(selectedItems.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  };

  const pendingItems = items.filter(i => i.status === "pending");
  const approvedItems = items.filter(i => i.status === "approved");

  return {
    // State
    searchQuery, setSearchQuery,
    searchType, setSearchType,
    selectedCategory, setSelectedCategory,
    importCategory, setImportCategory,
    selectedItems, setSelectedItems,
    activeTab, setActiveTab,
    filterStatus, setFilterStatus,
    filterSession, setFilterSession,
    contentText, setContentText,
    uploadingFile,
    fileInputRef,
    itemCategoryOverrides, setItemCategoryOverrides,
    bulkCollecting, bulkProgress,
    scheduleDialogOpen, setScheduleDialogOpen,
    scheduleForm, setScheduleForm,
    // Data
    stats, categories, sessions, items, itemsLoading, schedules,
    pendingItems, approvedItems,
    // Mutations
    searchMutation, handleFileUpload, updateStatusMutation,
    importMutation, enrichMutation, batchEnrichMutation,
    deleteMutation, createScheduleMutation, toggleScheduleMutation,
    runScheduleMutation, deleteScheduleMutation,
    handleBulkCollect,
    // Helpers
    toggleSelect, toggleSelectAll,
  };
}
