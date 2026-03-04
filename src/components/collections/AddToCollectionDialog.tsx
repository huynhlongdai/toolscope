import { useState } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  const handleAdd = (collectionId: string) => {
    addToCollection({ collectionId, toolId });
    setOpen(false);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCollection(
      { name: newName.trim() },
      {
        onSuccess: (data: any) => {
          addToCollection({ collectionId: data.id, toolId });
          setNewName("");
          setShowNew(false);
          setOpen(false);
        },
      } as any
    );
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => toast({ title: "Vui lòng đăng nhập", variant: "destructive" })}
      >
        <FolderPlus className="h-3.5 w-3.5" /> Thêm vào Collection
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FolderPlus className="h-3.5 w-3.5" /> Thêm vào Collection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm "{toolName}" vào Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {myCollections.map((c: any) => (
            <button
              key={c.id}
              onClick={() => handleAdd(c.id)}
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
      </DialogContent>
    </Dialog>
  );
}
