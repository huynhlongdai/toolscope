import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Check, Book } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

const CATEGORIES = ["general", "brand", "technical", "ui"];

interface GlossaryTerm {
  id: string;
  source_term: string;
  locale: string;
  translated_term: string;
  context: string | null;
  category: string;
  approved: boolean;
  created_at: string;
}

export default function TranslationGlossaryPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterLocale, setFilterLocale] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [newTerm, setNewTerm] = useState({
    source_term: "",
    locale: "vi",
    translated_term: "",
    context: "",
    category: "general",
  });

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["glossary", filterLocale, filterCategory],
    queryFn: async () => {
      let query = supabase
        .from("translation_glossary")
        .select("*")
        .order("source_term", { ascending: true });

      if (filterLocale !== "all") query = query.eq("locale", filterLocale);
      if (filterCategory !== "all") query = query.eq("category", filterCategory);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GlossaryTerm[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (term: typeof newTerm) => {
      const { error } = await supabase.from("translation_glossary").insert({
        ...term,
        approved: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary"] });
      setNewTerm({ source_term: "", locale: "vi", translated_term: "", context: "", category: "general" });
      toast({ title: "Term added", description: "Glossary term added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("translation_glossary").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["glossary"] });
      toast({ title: "Deleted", description: "Term removed" });
    },
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("translation_glossary")
        .update({ approved: !approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["glossary"] }),
  });

  const handleAdd = () => {
    if (!newTerm.source_term || !newTerm.translated_term) {
      toast({ title: "Required", description: "Source and translated term are required", variant: "destructive" });
      return;
    }
    addMutation.mutate(newTerm);
  };

  const localeOptions = Object.entries(SUPPORTED_LOCALES).filter(([k]) => k !== "en");

  return (
    <div className="space-y-6">
      {/* Add new term */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Add Glossary Term
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input
              placeholder="Source term (English)"
              value={newTerm.source_term}
              onChange={(e) => setNewTerm({ ...newTerm, source_term: e.target.value })}
              className="md:col-span-1"
            />
            <Select value={newTerm.locale} onValueChange={(v) => setNewTerm({ ...newTerm, locale: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {localeOptions.map(([code, info]) => (
                  <SelectItem key={code} value={code}>{info.flag} {code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Translated term"
              value={newTerm.translated_term}
              onChange={(e) => setNewTerm({ ...newTerm, translated_term: e.target.value })}
              className="md:col-span-1"
            />
            <Input
              placeholder="Context (optional)"
              value={newTerm.context}
              onChange={(e) => setNewTerm({ ...newTerm, context: e.target.value })}
            />
            <Select value={newTerm.category} onValueChange={(v) => setNewTerm({ ...newTerm, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterLocale} onValueChange={setFilterLocale}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All locales" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locales</SelectItem>
            {localeOptions.map(([code, info]) => (
              <SelectItem key={code} value={code}>{info.flag} {info.nativeName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="self-center">
          {terms.length} terms
        </Badge>
      </div>

      {/* Glossary Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source (EN)</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Translation</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : terms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No glossary terms yet. Add your first term above.
                  </TableCell>
                </TableRow>
              ) : (
                terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.source_term}</TableCell>
                    <TableCell>
                      {SUPPORTED_LOCALES[term.locale as keyof typeof SUPPORTED_LOCALES]?.flag}{" "}
                      {term.locale}
                    </TableCell>
                    <TableCell>{term.translated_term}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {term.context || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{term.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={term.approved ? "default" : "secondary"}>
                        {term.approved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleApproval.mutate({ id: term.id, approved: term.approved })}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(term.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
