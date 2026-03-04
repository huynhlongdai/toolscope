import { useState } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCollections } from "@/hooks/useCollections";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  toolId: string;
  toolName: string;
}

export function AddToCollectionDialog({ toolId, toolName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { myCollections, createCollection, addToCollection } = useCollections();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [note, setNote] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const handleAdd = (collectionId: string) => {
    if (!note.trim()) {
      // Add directly without note
      addToCollection({ collectionId, toolId });
      setOpen(false);
      setNote("");
      return;
    }
    // Show note input
    setSelectedCollectionId(collectionId);
  };

  const confirmAdd = () => {
    if (!selectedCollectionId) return;
    addToCollection({ collectionId: selectedCollectionId, toolId, note: note.trim() || undefined });
    setOpen(false);
    setNote("");
    setSelectedCollectionId(null);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCollection(
      { name: newName.trim() },
      {
        onSuccess: (data: any) => {
          addToCollection({ collectionId: data.id, toolId, note: note.trim() || undefined });
          setNewName("");
          setShowNew(false);
          setOpen(false);
          setNote("");
        },
      } as any
    );
  };

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => toast({ title: "Vui lòng đăng nhập", variant: "destructive" })}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Thêm vào Collection</p></TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedCollectionId(null); setNote(""); } }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <FolderPlus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent><p>Thêm vào Collection</p></TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm "{toolName}" vào Collection</DialogTitle>
        </DialogHeader>

        {selectedCollectionId ? (
          <div className="space-y-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú về tool này (tùy chọn)..."
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedCollectionId(null)}>Quay lại</Button>
              <Button size="sm" onClick={confirmAdd}>Thêm</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Note input */}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (tùy chọn)..."
              rows={2}
              className="text-sm"
            />

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {myCollections.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    addToCollection({ collectionId: c.id, toolId, note: note.trim() || undefined });
                    setOpen(false);
                    setNote("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{c.name}</span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
            {showNew ? (
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tên collection..."
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreate}>Tạo</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowNew(true)}>
                <Plus className="h-4 w-4" /> Tạo collection mới
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
