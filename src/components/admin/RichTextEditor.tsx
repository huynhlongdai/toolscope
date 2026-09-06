import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ImageIcon, LinkIcon, Youtube as YoutubeIcon, Quote, Code,
  Undo, Redo, Upload, Loader2, Palette, RemoveFormatting, Highlighter,
  TableIcon, Plus, Minus, Trash2, SquarePlus,
  MoveHorizontal, MoveVertical, Merge, Split,
  Maximize, Minimize, ChevronDown, Type, Heading1, Heading2, Heading3, Heading4,
  LayoutGrid, MessageSquareQuote, Timer, Tag, Grip, FileText,
  History, X, Save,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /**
   * When provided, enables WordPress-style local autosave/draft-recovery:
   * every ~2s of inactivity the current HTML is persisted to
   * localStorage under `rte-autosave:${autosaveKey}`. On mount, if a
   * saved draft differs from the incoming `content` prop, a recovery
   * banner offers to restore it or discard it. Pass a stable per-record
   * key, e.g. `blog-${post?.id ?? "new"}`, so drafts don't leak across
   * unrelated posts/pages. Protects against browser crash / accidental
   * tab close before the surrounding form's own Save button is clicked -
   * it does NOT replace that Save (nothing is written to the DB here).
   */
  autosaveKey?: string;
}

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_PREFIX = "rte-autosave:";

/**
 * Call after the surrounding form successfully persists content to the
 * database (e.g. inside a mutation's onSuccess), passing the same key
 * given to <RichTextEditor autosaveKey=... />. Clears the now-stale local
 * draft so the recovery banner doesn't reappear with outdated content the
 * next time this record is opened for editing.
 */
export function clearAutosaveDraft(autosaveKey: string) {
  try { localStorage.removeItem(`${AUTOSAVE_PREFIX}${autosaveKey}`); } catch { /* ignore */ }
}

export function RichTextEditor({ content, onChange, placeholder = "Nhập nội dung...", autosaveKey }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const storageKey = autosaveKey ? `${AUTOSAVE_PREFIX}${autosaveKey}` : null;
  const [draftAvailable, setDraftAvailable] = useState<{ html: string; savedAt: number } | null>(null);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<number | null>(null);
  const initialContentRef = useRef(content);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({ width: 640, height: 360 }),
      Color,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      scheduleAutosave(html);
    },
  });

  const scheduleAutosave = useCallback((html: string) => {
    if (!storageKey) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ html, savedAt: Date.now() }));
        setLastAutosavedAt(Date.now());
      } catch {
        // localStorage full/unavailable (private mode, quota) - autosave is
        // best-effort only, never block editing.
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // On mount: check for a saved draft newer/different than the content the
  // parent form loaded us with, and offer to restore it.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { html: string; savedAt: number };
      if (saved?.html && saved.html !== initialContentRef.current) {
        setDraftAvailable(saved);
      }
    } catch {
      // Corrupt/unreadable draft entry - ignore silently, not worth surfacing.
    }
    // Only run once per mount (per autosaveKey) - intentionally not
    // re-checking on every content prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, []);

  const restoreDraft = () => {
    if (!draftAvailable || !editor) return;
    editor.commands.setContent(draftAvailable.html);
    onChange(draftAvailable.html);
    setDraftAvailable(null);
  };

  const discardDraft = () => {
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } }
    setDraftAvailable(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) { alert("Chỉ hỗ trợ ảnh JPG, PNG, GIF, WEBP"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("editor-images").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(filePath);
      editor?.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err: any) { alert("Upload thất bại: " + err.message); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("editor-images").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(filePath);
      editor?.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err: any) { alert("Upload thất bại: " + err.message); }
    finally { setUploading(false); }
  }, [editor]);

  const addImage = () => {
    const url = prompt("Image URL:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const handleSetLink = () => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl, target: linkNewTab ? "_blank" : null }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  const openLinkPopover = () => {
    const existingUrl = editor?.getAttributes("link").href || "";
    setLinkUrl(existingUrl);
    setLinkOpen(true);
  };

  const addYoutube = () => {
    const url = prompt("YouTube URL:");
    if (url) editor?.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const insertSnippet = (html: string) => {
    editor?.chain().focus().insertContent(html).run();
  };

  if (!editor) return null;

  // Word count & reading time
  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Current block type label
  const getBlockLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("heading", { level: 4 })) return "Heading 4";
    if (editor.isActive("blockquote")) return "Blockquote";
    if (editor.isActive("codeBlock")) return "Code Block";
    return "Paragraph";
  };

  const ToolbarButton = ({ onClick, active, children, title, disabled }: any) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );

  const editorContent = (
    <div className={`border rounded-md flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-background rounded-none" : ""}`}>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileUpload} />

      {/* Draft recovery banner (autosave) */}
      {draftAvailable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
            <History className="h-3.5 w-3.5 shrink-0" />
            Có bản nháp tự động lưu lúc {new Date(draftAvailable.savedAt).toLocaleString("vi-VN")} chưa được lưu vào hệ thống.
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2" onClick={restoreDraft}>
              Khôi phục
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={discardDraft} title="Bỏ bản nháp">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar Row 1: Block type + Text formatting + Color */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1 bg-muted/30">
        {/* Block type selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs px-2 min-w-[100px] justify-between" onMouseDown={(e: React.MouseEvent) => e.preventDefault()}>
              {getBlockLabel()}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setParagraph().run()}>
              <Type className="h-4 w-4 mr-2" /> Paragraph
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-4 w-4 mr-2" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-4 w-4 mr-2" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="h-4 w-4 mr-2" /> Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
              <Heading4 className="h-4 w-4 mr-2" /> Heading 4
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4 mr-2" /> Blockquote
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <Code className="h-4 w-4 mr-2" /> Code Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} title="Màu chữ">
              <Palette className="h-3.5 w-3.5" style={{ color: editor.getAttributes("textStyle").color || undefined }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-8 gap-1">
              {["#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#ffffff","#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0","#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79","#990000","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"].map((c) => (
                <button key={c} className="h-5 w-5 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setColor(c).run()} />
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={() => editor.chain().focus().unsetColor().run()}>
              <RemoveFormatting className="h-3 w-3 mr-1" /> Xóa màu
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant={editor.isActive("highlight") ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} title="Highlight">
              <Highlighter className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {["#fef08a","#bbf7d0","#bfdbfe","#fecaca","#e9d5ff","#fed7aa","#fde047","#86efac","#93c5fd","#fca5a5","#d8b4fe","#fdba74"].map((c) => (
                <button key={c} className="h-5 w-5 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} />
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={() => editor.chain().focus().unsetHighlight().run()}>
              <RemoveFormatting className="h-3 w-3 mr-1" /> Xóa highlight
            </Button>
          </PopoverContent>
        </Popover>

        <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Xóa format">
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Toolbar Row 2: Align + Lists + Media + Table + Blocks + Undo/Redo */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1 bg-muted/30">
        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right"><AlignRight className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"><ListOrdered className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Link popover */}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant={editor.isActive("link") ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={openLinkPopover} title="Link">
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">URL</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm mt-1" onKeyDown={(e) => e.key === "Enter" && handleSetLink()} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="link-new-tab" checked={linkNewTab} onCheckedChange={(v) => setLinkNewTab(!!v)} />
                <Label htmlFor="link-new-tab" className="text-xs">Mở tab mới</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSetLink}>Áp dụng</Button>
                {editor.isActive("link") && (
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}>Xóa link</Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Media */}
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload ảnh" disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Image URL"><ImageIcon className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="YouTube"><YoutubeIcon className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Table */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant={editor.isActive("table") ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} title="Table">
              <TableIcon className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <SquarePlus className="h-3.5 w-3.5 mr-2" /> Chèn bảng 3×3
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()}>
              <SquarePlus className="h-3.5 w-3.5 mr-2" /> Chèn bảng 4×4
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()}>
              <MoveHorizontal className="h-3.5 w-3.5 mr-2" /> Thêm cột
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()}>
              <MoveVertical className="h-3.5 w-3.5 mr-2" /> Thêm hàng
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()} disabled={!editor.can().deleteColumn()}>
              <Minus className="h-3.5 w-3.5 mr-2" /> Xóa cột
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()} disabled={!editor.can().deleteRow()}>
              <Minus className="h-3.5 w-3.5 mr-2" /> Xóa hàng
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().mergeCells().run()} disabled={!editor.can().mergeCells()}>
              <Merge className="h-3.5 w-3.5 mr-2" /> Gộp ô
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().splitCell().run()} disabled={!editor.can().splitCell()}>
              <Split className="h-3.5 w-3.5 mr-2" /> Tách ô
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.can().deleteTable()} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Xóa bảng
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Block Inserter "+" */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} title="Chèn khối">
              <Plus className="h-3.5 w-3.5" /> Chèn
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px] max-h-[400px] overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Nội dung</div>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <Minus className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Đường phân cách</div><div className="text-xs text-muted-foreground">Ngăn cách các phần nội dung</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Trích dẫn</div><div className="text-xs text-muted-foreground">Blockquote nổi bật</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <Code className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Code Block</div><div className="text-xs text-muted-foreground">Hiển thị mã nguồn</div></div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Khối đặc biệt</div>

            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`
              <div data-type="button-block" style="text-align:center;margin:16px 0;">
                <a href="#" style="display:inline-block;padding:12px 32px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Click me</a>
              </div>
            `)}>
              <LayoutGrid className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Button</div><div className="text-xs text-muted-foreground">Nút CTA với link</div></div>
            </DropdownMenuItem>

            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`
              <div data-type="accordion-block" style="border:1px solid #e5e7eb;border-radius:8px;margin:16px 0;overflow:hidden;">
                <details style="padding:0;">
                  <summary style="padding:12px 16px;font-weight:600;cursor:pointer;background:#f9fafb;">Tiêu đề Accordion</summary>
                  <div style="padding:12px 16px;border-top:1px solid #e5e7eb;">Nội dung accordion ở đây...</div>
                </details>
              </div>
            `)}>
              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Accordion</div><div className="text-xs text-muted-foreground">Nội dung mở rộng/thu gọn</div></div>
            </DropdownMenuItem>

            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`
              <div data-type="testimonial-block" style="border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:16px 0;background:#f9fafb;">
                <p style="font-style:italic;font-size:16px;margin-bottom:12px;">"Sản phẩm rất tuyệt vời, tôi rất hài lòng!"</p>
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:40px;height:40px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">N</div>
                  <div>
                    <p style="font-weight:600;margin:0;">Nguyễn Văn A</p>
                    <p style="color:#6b7280;font-size:14px;margin:0;">CEO, Công ty ABC</p>
                  </div>
                </div>
              </div>
            `)}>
              <MessageSquareQuote className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Testimonial</div><div className="text-xs text-muted-foreground">Đánh giá/nhận xét khách hàng</div></div>
            </DropdownMenuItem>

            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`
              <div data-type="price-table-block" style="margin:16px 0;">
                <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                  <thead><tr style="background:#6366f1;color:white;">
                    <th style="padding:12px 16px;text-align:left;">Gói</th>
                    <th style="padding:12px 16px;text-align:center;">Free</th>
                    <th style="padding:12px 16px;text-align:center;">Pro</th>
                    <th style="padding:12px 16px;text-align:center;">Enterprise</th>
                  </tr></thead>
                  <tbody>
                    <tr><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">Giá</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">$0</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">$29/tháng</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">Liên hệ</td></tr>
                    <tr><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">Tính năng A</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">✓</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">✓</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">✓</td></tr>
                    <tr><td style="padding:10px 16px;">Tính năng B</td><td style="padding:10px 16px;text-align:center;">✗</td><td style="padding:10px 16px;text-align:center;">✓</td><td style="padding:10px 16px;text-align:center;">✓</td></tr>
                  </tbody>
                </table>
              </div>
            `)}>
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Price Table</div><div className="text-xs text-muted-foreground">Bảng giá so sánh gói</div></div>
            </DropdownMenuItem>

            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`
              <div data-type="countdown-block" style="text-align:center;padding:24px;margin:16px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:12px;">
                <p style="font-size:14px;margin-bottom:8px;opacity:0.9;">⏰ Ưu đãi kết thúc sau</p>
                <div style="display:flex;justify-content:center;gap:16px;font-size:32px;font-weight:bold;">
                  <div><span>07</span><p style="font-size:12px;font-weight:normal;">Ngày</p></div>
                  <div><span>:</span></div>
                  <div><span>12</span><p style="font-size:12px;font-weight:normal;">Giờ</p></div>
                  <div><span>:</span></div>
                  <div><span>45</span><p style="font-size:12px;font-weight:normal;">Phút</p></div>
                  <div><span>:</span></div>
                  <div><span>30</span><p style="font-size:12px;font-weight:normal;">Giây</p></div>
                </div>
              </div>
            `)}>
              <Timer className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Countdown</div><div className="text-xs text-muted-foreground">Đếm ngược ưu đãi</div></div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`<p>[deals]</p>`)}>
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Deal Block</div><div className="text-xs text-muted-foreground">Hiển thị ưu đãi của tool</div></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Fullscreen */}
        <ToolbarButton onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
          {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <div
        className={`flex-1 overflow-y-auto ${isFullscreen ? "max-h-[calc(100vh-120px)]" : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <EditorContent editor={editor} className="prose prose-sm prose-neutral dark:prose-invert max-w-none p-4 min-h-[300px] focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[280px] [&_.tiptap_table]:border-collapse [&_.tiptap_table]:w-full [&_.tiptap_table_td]:border [&_.tiptap_table_td]:border-border [&_.tiptap_table_td]:p-2 [&_.tiptap_table_th]:border [&_.tiptap_table_th]:border-border [&_.tiptap_table_th]:p-2 [&_.tiptap_table_th]:bg-muted/50 [&_.tiptap_table_th]:font-semibold [&_.selectedCell]:bg-primary/10" />
      </div>

      {/* Footer: Word count + Reading time + autosave status */}
      <div className="flex items-center justify-between border-t px-3 py-1.5 bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>📝 {wordCount} từ</span>
          <span>⏱ ~{readingTime} phút đọc</span>
          {storageKey && lastAutosavedAt && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
              <Save className="h-3 w-3" /> Đã lưu nháp {new Date(lastAutosavedAt).toLocaleTimeString("vi-VN")}
            </span>
          )}
        </div>
        {uploading && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Đang upload...</span>}
      </div>
    </div>
  );

  return editorContent;
}
