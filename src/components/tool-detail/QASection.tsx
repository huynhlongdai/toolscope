import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { VoteButtons } from "./VoteButtons";
import { HelpCircle, CheckCircle2, Send } from "lucide-react";

interface QASectionProps {
  toolId: string;
  userId?: string;
}

export function QASection({ toolId, userId }: QASectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [qTitle, setQTitle] = useState("");
  const [qContent, setQContent] = useState("");
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

  const { data: questions } = useQuery({
    queryKey: ["questions", toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*, profiles:user_id(display_name)")
        .eq("tool_id", toolId)
        .order("upvotes", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!toolId,
  });

  const { data: answers } = useQuery({
    queryKey: ["answers", toolId],
    queryFn: async () => {
      if (!questions?.length) return [];
      const qIds = questions.map(q => q.id);
      const { data, error } = await supabase
        .from("answers")
        .select("*, profiles:user_id(display_name)")
        .in("question_id", qIds)
        .order("is_accepted", { ascending: false })
        .order("upvotes", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!questions?.length,
  });

  const submitQuestion = async () => {
    if (!userId) { toast({ title: "Vui lòng đăng nhập", variant: "destructive" }); return; }
    if (!qTitle.trim()) return;
    const { error } = await supabase.from("questions").insert({
      tool_id: toolId, user_id: userId, title: qTitle.trim(), content: qContent.trim() || null,
    });
    if (error) { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); return; }
    setQTitle(""); setQContent(""); setShowForm(false);
    toast({ title: "Đã đặt câu hỏi!" });
    queryClient.invalidateQueries({ queryKey: ["questions", toolId] });
  };

  const submitAnswer = async (questionId: string) => {
    if (!userId) { toast({ title: "Vui lòng đăng nhập", variant: "destructive" }); return; }
    const text = answerTexts[questionId]?.trim();
    if (!text) return;
    const { error } = await supabase.from("answers").insert({
      question_id: questionId, user_id: userId, content: text,
    });
    if (error) { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); return; }
    setAnswerTexts(prev => ({ ...prev, [questionId]: "" }));
    toast({ title: "Đã trả lời!" });
    queryClient.invalidateQueries({ queryKey: ["answers", toolId] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" /> Hỏi & Đáp ({questions?.length || 0})
          </CardTitle>
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)} disabled={!userId}>
              Đặt câu hỏi
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-2 rounded-lg border border-border p-4">
            <Input placeholder="Tiêu đề câu hỏi" value={qTitle} onChange={e => setQTitle(e.target.value)} maxLength={200} />
            <Textarea placeholder="Chi tiết (tùy chọn)" value={qContent} onChange={e => setQContent(e.target.value)} className="min-h-[60px]" maxLength={2000} />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitQuestion}>Gửi</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Hủy</Button>
            </div>
          </div>
        )}

        {questions && questions.length > 0 ? (
          <div className="space-y-5">
            {questions.map((q) => {
              const qAnswers = answers?.filter(a => a.question_id === q.id) || [];
              return (
                <div key={q.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <VoteButtons targetId={q.id} targetType="question" upvotes={q.upvotes} downvotes={q.downvotes} userId={userId} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{q.title}</h4>
                        {q.is_resolved && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      </div>
                      {q.content && <p className="mt-1 text-xs text-muted-foreground">{q.content}</p>}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{(q.profiles as any)?.display_name || "Ẩn danh"}</span>
                        <span>·</span>
                        <span>{new Date(q.created_at).toLocaleDateString("vi-VN")}</span>
                        <span>·</span>
                        <span>{qAnswers.length} câu trả lời</span>
                      </div>

                      {/* Answers */}
                      {qAnswers.length > 0 && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-border">
                          {qAnswers.map(a => (
                            <div key={a.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{(a.profiles as any)?.display_name || "Ẩn danh"}</span>
                                {a.is_accepted && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                <span className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString("vi-VN")}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">{a.content}</p>
                              <div className="mt-1">
                                <VoteButtons targetId={a.id} targetType="answer" upvotes={a.upvotes} downvotes={a.downvotes} userId={userId} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer input */}
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder={userId ? "Trả lời..." : "Đăng nhập để trả lời"}
                          value={answerTexts[q.id] || ""}
                          onChange={e => setAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="h-8 text-xs"
                          disabled={!userId}
                          maxLength={2000}
                        />
                        {answerTexts[q.id]?.trim() && (
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => submitAnswer(q.id)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !showForm && <p className="text-sm text-muted-foreground">Chưa có câu hỏi nào. Hãy đặt câu hỏi đầu tiên!</p>
        )}
      </CardContent>
    </Card>
  );
}
