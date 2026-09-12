import { Extension } from "@tiptap/core";
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
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import CharacterCount from "@tiptap/extension-character-count";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
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
  LayoutGrid, MessageSquareQuote, Timer, Tag, FileText,
  History, X, Save, CheckSquare, AlertCircle, AlertTriangle,
  CheckCircle2, Info, HelpCircle, Star, Smile,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InsertToolDialog, InsertDealDialog } from "@/components/admin/InsertToolDealDialogs";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/extension-bubble-menu";
import { ToolBlock } from "@/components/admin/ToolBlockExtension";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autosaveKey?: string;
}

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_PREFIX = "rte-autosave:";

export function clearAutosaveDraft(autosaveKey: string) {
  try { localStorage.removeItem(`${AUTOSAVE_PREFIX}${autosaveKey}`); } catch { /* ignore */ }
}

const SlashCommand = Extension.create({
  name: "slashCommand",
  addKeyboardShortcuts() {
    return {};
  },
});

const CALLOUT_BLOCKS = [
  {
    key: "info",
    label: "Info Callout",
    description: "Hộp thông tin (xanh)",
    icon: Info,
    iconColor: "text-blue-600",
    html: '<div class="callout callout-info" style="background:#dbeafe;border-left:4px solid #3b82f6;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>\u2139\ufe0f Th\u00f4ng tin:</strong> N\u1ed9i dung th\u00f4ng tin \u1edf \u0111\u00e2y...</p></div><p></p>',
  },
  {
    key: "warning",
    label: "Warning Callout",
    description: "Hộp cảnh báo (vàng)",
    icon: AlertTriangle,
    iconColor: "text-yellow-600",
    html: '<div class="callout callout-warning" style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>\u26a0\ufe0f C\u1ea3nh b\u00e1o:</strong> N\u1ed9i dung c\u1ea3nh b\u00e1o \u1edf \u0111\u00e2y...</p></div><p></p>',
  },
  {
    key: "success",
    label: "Success Callout",
    description: "Hộp thành công (xanh lá)",
    icon: CheckCircle2,
    iconColor: "text-green-600",
    html: '<div class="callout callout-success" style="background:#d1fae5;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>\u2705 Th\u00e0nh c\u00f4ng:</strong> N\u1ed9i dung th\u00e0nh c\u00f4ng \u1edf \u0111\u00e2y...</p></div><p></p>',
  },
  {
    key: "error",
    label: "Error Callout",
    description: "Hộp lỗi (đỏ)",
    icon: AlertCircle,
    iconColor: "text-red-600",
    html: '<div class="callout callout-error" style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>\u274c L\u1ed7i:</strong> N\u1ed9i dung l\u1ed7i \u1edf \u0111\u00e2y...</p></div><p></p>',
  },
];

const SPECIAL_BLOCKS = [
  {
    key: "faq",
    label: "FAQ Block",
    description: "Câu hỏi thường gặp",
    icon: HelpCircle,
    html: '<div class="faq-block" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;background:#f9fafb;"><h4 style="margin:0 0 8px 0;font-weight:600;color:#1f2937;">\u2753 C\u00e2u h\u1ecfi th\u01b0\u1eddng g\u1eb7p</h4><details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:500;">C\u00e2u h\u1ecfi 1?</summary><p style="margin:8px 0 0 0;">C\u00e2u tr\u1ea3 l\u1eddi 1...</p></details><details><summary style="cursor:pointer;font-weight:500;">C\u00e2u h\u1ecfi 2?</summary><p style="margin:8px 0 0 0;">C\u00e2u tr\u1ea3 l\u1eddi 2...</p></details></div><p></p>',
  },
  {
    key: "proscons",
    label: "Pros & Cons",
    description: "Ưu và nhược điểm",
    icon: Smile,
    html: '<div class="pros-cons" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;"><div style="border:2px solid #10b981;border-radius:8px;padding:16px;"><h4 style="margin:0 0 12px 0;color:#10b981;font-weight:600;">\u2705 \u01afu \u0111i\u1ec3m</h4><ul style="margin:0;padding-left:20px;"><li>\u01afu \u0111i\u1ec3m 1</li><li>\u01afu \u0111i\u1ec3m 2</li></ul></div><div style="border:2px solid #ef4444;border-radius:8px;padding:16px;"><h4 style="margin:0 0 12px 0;color:#ef4444;font-weight:600;">\u274c Nh\u01b0\u1ee3c \u0111i\u1ec3m</h4><ul style="margin:0;padding-left:20px;"><li>Nh\u01b0\u1ee3c \u0111i\u1ec3m 1</li><li>Nh\u01b0\u1ee3c \u0111i\u1ec3m 2</li></ul></div></div><p></p>',
  },
  {
    key: "rating",
    label: "Rating",
    description: "Đánh giá sao",
    icon: Star,
    html: '<div class="rating-block" style="text-align:center;padding:16px;margin:16px 0;background:#f9fafb;border-radius:8px;"><div style="font-size:24px;color:#fbbf24;margin-bottom:8px;">\u2605\u2605\u2605\u2605\u2605</div><p style="margin:0;font-weight:600;">\u0110\u00e1nh gi\u00e1: 5/5</p><p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">M\u00f4 t\u1ea3 \u0111\u00e1nh gi\u00e1...</p></div><p></p>',
  },
  {
    key: "button",
    label: "CTA Button",
    description: "Nút CTA với link",
    icon: LayoutGrid,
    html: '<div data-type="button-block" style="text-align:center;margin:16px 0;"><a href="#" style="display:inline-block;padding:12px 32px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Click me</a></div><p></p>',
  },
  {
    key: "accordion",
    label: "Accordion",
    description: "Nội dung mở rộng/thu gọn",
    icon: FileText,
    html: '<div data-type="accordion-block" style="border:1px solid #e5e7eb;border-radius:8px;margin:16px 0;overflow:hidden;"><details style="padding:0;"><summary style="padding:12px 16px;font-weight:600;cursor:pointer;background:#f9fafb;">Ti\u00eau \u0111\u1ec1 Accordion</summary><div style="padding:12px 16px;border-top:1px solid #e5e7eb;">N\u1ed9i dung accordion \u1edf \u0111\u00e2y...</div></details></div><p></p>',
  },
  {
    key: "testimonial",
    label: "Testimonial",
    description: "Đánh giá/nhận xét",
    icon: MessageSquareQuote,
    html: '<div data-type="testimonial-block" style="border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:16px 0;background:#f9fafb;"><p style="font-style:italic;font-size:16px;margin-bottom:12px;">\u201cS\u1ea3n ph\u1ea9m r\u1ea5t tuy\u1ec7t v\u1eddi, t\u00f4i r\u1ea5t h\u00e0i l\u00f2ng!\u201d</p><div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">N</div><div><p style="font-weight:600;margin:0;">Nguy\u1ec5n V\u0103n A</p><p style="color:#6b7280;font-size:14px;margin:0;">CEO, C\u00f4ng ty ABC</p></div></div></div><p></p>',
  },
  {
    key: "pricetable",
    label: "Price Table",
    description: "Bảng giá so sánh",
    icon: Tag,
    html: '<div data-type="price-table-block" style="margin:16px 0;"><table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><thead><tr style="background:#6366f1;color:white;"><th style="padding:12px 16px;text-align:left;">G\u00f3i</th><th style="padding:12px 16px;text-align:center;">Free</th><th style="padding:12px 16px;text-align:center;">Pro</th><th style="padding:12px 16px;text-align:center;">Enterprise</th></tr></thead><tbody><tr><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">Gi\u00e1</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">$0</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">$29/th\u00e1ng</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">Li\u00ean h\u1ec7</td></tr><tr><td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">T\u00ednh n\u0103ng A</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">\u2713</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">\u2713</td><td style="padding:10px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">\u2713</td></tr><tr><td style="padding:10px 16px;">T\u00ednh n\u0103ng B</td><td style="padding:10px 16px;text-align:center;">\u2717</td><td style="padding:10px 16px;text-align:center;">\u2713</td><td style="padding:10px 16px;text-align:center;">\u2713</td></tr></tbody></table></div><p></p>',
  },
  {
    key: "countdown",
    label: "Countdown",
    description: "Đếm ngược ưu đãi",
    icon: Timer,
    html: '<div data-type="countdown-block" style="text-align:center;padding:24px;margin:16px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:12px;"><p style="font-size:14px;margin-bottom:8px;opacity:0.9;">\u23f0 \u01afu \u0111\u00e3i k\u1ebft th\u00fac sau</p><div style="display:flex;justify-content:center;gap:16px;font-size:32px;font-weight:bold;"><div><span>07</span><p style="font-size:12px;font-weight:normal;">Ng\u00e0y</p></div><div><span>:</span></div><div><span>12</span><p style="font-size:12px;font-weight:normal;">Gi\u1edd</p></div><div><span>:</span></div><div><span>45</span><p style="font-size:12px;font-weight:normal;">Ph\u00fat</p></div><div><span>:</span></div><div><span>30</span><p style="font-size:12px;font-weight:normal;">Gi\u00e2y</p></div></div></div><p></p>',
  },
];

interface SlashMenuItem {
  key: string;
  label: string;
  description: string;
  icon: any;
  iconColor?: string;
  html: string;
  category: string;
}

function buildSlashItems(): SlashMenuItem[] {
  const items: SlashMenuItem[] = [
    { key: "h1", label: "Heading 1", description: "Tiêu đề lớn", icon: Heading1, category: "Text", html: "<h1></h1>" },
    { key: "h2", label: "Heading 2", description: "Tiêu đề vừa", icon: Heading2, category: "Text", html: "<h2></h2>" },
    { key: "h3", label: "Heading 3", description: "Tiêu đề nhỏ", icon: Heading3, category: "Text", html: "<h3></h3>" },
    { key: "ul", label: "Bullet List", description: "Danh sách", icon: List, category: "Text", html: "" },
    { key: "ol", label: "Ordered List", description: "Danh sách có số", icon: ListOrdered, category: "Text", html: "" },
    { key: "quote", label: "Blockquote", description: "Trích dẫn", icon: Quote, category: "Text", html: "" },
    { key: "code", label: "Code Block", description: "Mã nguồn", icon: Code, category: "Text", html: "" },
    { key: "hr", label: "Divider", description: "Đường phân cách", icon: Minus, category: "Text", html: "" },
    { key: "task", label: "Task List", description: "Checklist", icon: CheckSquare, category: "Text", html: "" },
  ];
  for (const c of CALLOUT_BLOCKS) {
    items.push({ key: c.key, label: c.label, description: c.description, icon: c.icon, iconColor: c.iconColor, category: "Callout", html: c.html });
  }
  for (const b of SPECIAL_BLOCKS) {
    items.push({ key: b.key, label: b.label, description: b.description, icon: b.icon, category: "Blocks", html: b.html });
  }
  return items;
}

function SlashMenuPopover({
  open, query, onSelect, onClose,
}: {
  open: boolean;
  query: string;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const items = buildSlashItems().filter(
    (i) => i.label.toLowerCase().includes(query.toLowerCase()) || i.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { setSelectedIdx(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((p) => (p + 1) % items.length); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((p) => (p + items.length - 1) % items.length); }
      if (e.key === "Enter" && items[selectedIdx]) { e.preventDefault(); onSelect(items[selectedIdx]); }
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, items, selectedIdx, onSelect, onClose]);

  if (!open || items.length === 0) return null;

  const grouped = items.reduce<Record<string, SlashMenuItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  let flatIdx = 0;

  return (
    <div className="absolute left-0 bottom-full mb-1 z-50 min-w-[280px] max-w-[360px] rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
      <div className="max-h-[320px] overflow-y-auto p-1.5">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</div>
            {catItems.map((item) => {
              const idx = flatIdx++;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  className={`flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-sm transition-colors ${
                    idx === selectedIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  }`}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted ${item.iconColor || ""}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
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
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const slashStartPos = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image.configure({ allowBase64: true }),
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
      Dropcursor,
      Gapcursor,
      CharacterCount,
      TaskList,
      TaskItem.configure({ nested: true }),
      ToolBlock,
      SlashCommand,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      scheduleAutosave(html);
      detectSlash(editor);
    },
    onTransaction: ({ editor }) => {
      detectSlash(editor);
    },
  });

  const detectSlash = useCallback((ed: any) => {
    if (!ed) return;
    const { state } = ed;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, "\n");
    const lastLine = textBefore.split("\n").pop() || "";
    const slashMatch = lastLine.match(/^\/(.*)$/);
    if (slashMatch && !slashOpen) {
      slashStartPos.current = from - slashMatch[0].length;
      setSlashQuery(slashMatch[1]);
      setSlashOpen(true);
    } else if (slashMatch && slashOpen) {
      setSlashQuery(slashMatch[1]);
    } else if (slashOpen) {
      setSlashOpen(false);
      setSlashQuery("");
      slashStartPos.current = null;
    }
  }, [slashOpen]);

  const handleSlashSelect = useCallback((item: SlashMenuItem) => {
    if (!editor) return;
    const pos = slashStartPos.current;
    if (pos != null) {
      const { from } = editor.state.selection;
      editor.chain().focus().deleteRange({ from: pos, to: from }).run();
    }
    setSlashOpen(false);
    setSlashQuery("");
    slashStartPos.current = null;

    if (item.key === "ul") {
      editor.chain().focus().toggleBulletList().run();
    } else if (item.key === "ol") {
      editor.chain().focus().toggleOrderedList().run();
    } else if (item.key === "quote") {
      editor.chain().focus().toggleBlockquote().run();
    } else if (item.key === "code") {
      editor.chain().focus().toggleCodeBlock().run();
    } else if (item.key === "hr") {
      editor.chain().focus().setHorizontalRule().run();
    } else if (item.key === "task") {
      editor.chain().focus().toggleTaskList().run();
    } else if (item.key === "h1") {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (item.key === "h2") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (item.key === "h3") {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    } else if (item.html) {
      editor.chain().focus().insertContent(item.html).run();
    }
  }, [editor]);

  const scheduleAutosave = useCallback((html: string) => {
    if (!storageKey) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ html, savedAt: Date.now() }));
        setLastAutosavedAt(Date.now());
      } catch {
        /* localStorage full/unavailable */
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { html: string; savedAt: number };
      if (saved?.html && saved.html !== initialContentRef.current) {
        setDraftAvailable(saved);
      }
    } catch { /* ignore */ }
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

  const [insertToolOpen, setInsertToolOpen] = useState(false);
  const [insertDealOpen, setInsertDealOpen] = useState(false);

  if (!editor) return null;

  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const charCount = editor.storage.characterCount?.characters?.() ?? text.length;

  const getBlockLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("heading", { level: 4 })) return "Heading 4";
    if (editor.isActive("blockquote")) return "Blockquote";
    if (editor.isActive("codeBlock")) return "Code Block";
    if (editor.isActive("taskList")) return "Task List";
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

      {/* Draft recovery banner */}
      {draftAvailable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
            <History className="h-3.5 w-3.5 shrink-0" />
            Có bản nháp tự động lưu lúc {new Date(draftAvailable.savedAt).toLocaleString("vi-VN")}.
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2" onClick={restoreDraft}>Khôi phục</Button>
            <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={discardDraft} title="Bỏ"><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      {/* Toolbar Row 1 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1 bg-muted/30">
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
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleTaskList().run()}>
              <CheckSquare className="h-4 w-4 mr-2" /> Task List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

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

      {/* Toolbar Row 2 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1 bg-muted/30">
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right"><AlignRight className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"><ListOrdered className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Task list"><CheckSquare className="h-3.5 w-3.5" /></ToolbarButton>

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
          <DropdownMenuContent align="start" className="min-w-[260px] max-h-[450px] overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Nội dung</div>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <Minus className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Đường phân cách</div><div className="text-xs text-muted-foreground">Ngăn cách các phần</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Trích dẫn</div><div className="text-xs text-muted-foreground">Blockquote nổi bật</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <Code className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Code Block</div><div className="text-xs text-muted-foreground">Hiển thị mã nguồn</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleTaskList().run()}>
              <CheckSquare className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Task List</div><div className="text-xs text-muted-foreground">Checklist tương tác</div></div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Callout Boxes</div>
            {CALLOUT_BLOCKS.map((block) => {
              const Icon = block.icon;
              return (
                <DropdownMenuItem key={block.key} onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(block.html)}>
                  <Icon className={`h-4 w-4 mr-2 ${block.iconColor}`} />
                  <div><div className="font-medium text-sm">{block.label}</div><div className="text-xs text-muted-foreground">{block.description}</div></div>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Khối đặc biệt</div>
            {SPECIAL_BLOCKS.map((block) => {
              const Icon = block.icon;
              return (
                <DropdownMenuItem key={block.key} onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(block.html)}>
                  <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div><div className="font-medium text-sm">{block.label}</div><div className="text-xs text-muted-foreground">{block.description}</div></div>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`<p>[deals]</p>`)}>
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Deal Block</div><div className="text-xs text-muted-foreground">Hiển thị ưu đãi của tool</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => setInsertDealOpen(true)}>
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Chèn Deal cụ thể...</div><div className="text-xs text-muted-foreground">Tìm & chèn một deal</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => setInsertToolOpen(true)}>
              <SquarePlus className="h-4 w-4 mr-2 text-muted-foreground" />
              <div><div className="font-medium text-sm">Chèn Tool Card...</div><div className="text-xs text-muted-foreground">Tìm & chèn thẻ tool</div></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <InsertToolDialog open={insertToolOpen} onOpenChange={setInsertToolOpen} onInsert={insertSnippet} />
        <InsertDealDialog open={insertDealOpen} onOpenChange={setInsertDealOpen} onInsert={insertSnippet} />

        <div className="flex-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
          {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        </ToolbarButton>
      </div>

      {/* Editor content area */}
      <div
        className={`relative flex-1 overflow-y-auto ${isFullscreen ? "max-h-[calc(100vh-120px)]" : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Slash command popover */}
        <SlashMenuPopover
          open={slashOpen}
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => { setSlashOpen(false); setSlashQuery(""); slashStartPos.current = null; }}
        />

        {/* Bubble Menu - floating toolbar khi bôi đen text */}
        <TiptapBubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100, placement: "top" }}
        >
          <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1.5 shadow-lg">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strike">
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code">
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarButton onClick={openLinkPopover} active={editor.isActive("link")} title="Link">
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
        </TiptapBubbleMenu>

        <EditorContent
          editor={editor}
          className="prose prose-sm prose-neutral dark:prose-invert max-w-none p-4 min-h-[300px] focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[280px] [&_.tiptap_table]:border-collapse [&_.tiptap_table]:w-full [&_.tiptap_table_td]:border [&_.tiptap_table_td]:border-border [&_.tiptap_table_td]:p-2 [&_.tiptap_table_th]:border [&_.tiptap_table_th]:border-border [&_.tiptap_table_th]:p-2 [&_.tiptap_table_th]:bg-muted/50 [&_.tiptap_table_th]:font-semibold [&_.selectedCell]:bg-primary/10 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li_label]:sr-only [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_.ProseMirror-gapcursor]:border-t-2 [&_.ProseMirror-gapcursor]:border-primary"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-1.5 bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>📝 {wordCount} từ</span>
          <span>🔤 {charCount} ký tự</span>
          <span>⏱ ~{readingTime} phút đọc</span>
          {storageKey && lastAutosavedAt && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
              <Save className="h-3 w-3" /> Đã lưu nháp {new Date(lastAutosavedAt).toLocaleTimeString("vi-VN")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/50">Gõ <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">/</kbd> để chèn blocks</span>
          {uploading && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Đang upload...</span>}
        </div>
      </div>
    </div>
  );

  return editorContent;
}
