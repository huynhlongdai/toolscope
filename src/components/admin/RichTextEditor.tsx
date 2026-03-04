import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ImageIcon, LinkIcon, Youtube as YoutubeIcon, Quote, Code,
  Undo, Redo, Upload, Loader2, Palette, RemoveFormatting, Highlighter,
  TableIcon, Plus, Minus, Trash2, SquarePlus,
  MoveHorizontal, MoveVertical, Merge, Split,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Nhập nội dung..." }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false },
      }),
      Image,
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
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const addImage = () => {
    const url = prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
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
      editor.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err: any) { alert("Upload thất bại: " + err.message); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const addLink = () => {
    const url = prompt("Link URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = prompt("YouTube URL:");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const insertSnippet = (html: string) => {
    editor.chain().focus().insertContent(html).run();
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

  return (
    <div className="border rounded-md">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileUpload} />
      <div className="flex flex-wrap gap-0.5 border-b p-1 bg-muted/30">
        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

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

        <div className="w-px bg-border mx-0.5" />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive("heading", { level: 4 })} title="H4"><Heading4 className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px bg-border mx-0.5" />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"><ListOrdered className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px bg-border mx-0.5" />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right"><AlignRight className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px bg-border mx-0.5" />

        {/* Media & Links */}
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload ảnh" disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Image URL"><ImageIcon className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Link"><LinkIcon className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="YouTube"><YoutubeIcon className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote"><Quote className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block"><Code className="h-3.5 w-3.5" /></ToolbarButton>

        <div className="w-px bg-border mx-0.5" />

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

        {/* Insert Blocks dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} title="Chèn khối">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`
              <div data-type="button-block" style="text-align:center;margin:16px 0;">
                <a href="#" style="display:inline-block;padding:12px 32px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Click me</a>
              </div>
            `)}>
              🔘 Button
            </DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => insertSnippet(`
              <div data-type="accordion-block" style="border:1px solid #e5e7eb;border-radius:8px;margin:16px 0;overflow:hidden;">
                <details style="padding:0;">
                  <summary style="padding:12px 16px;font-weight:600;cursor:pointer;background:#f9fafb;">Tiêu đề Accordion</summary>
                  <div style="padding:12px 16px;border-top:1px solid #e5e7eb;">Nội dung accordion ở đây...</div>
                </details>
              </div>
            `)}>
              📋 Accordion
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
              💬 Testimonial
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
              💰 Price Table
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
              ⏳ Countdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              ➖ Đường phân cách
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px bg-border mx-0.5" />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="h-3.5 w-3.5" /></ToolbarButton>
      </div>
      <EditorContent editor={editor} className="prose prose-sm prose-neutral dark:prose-invert max-w-none p-3 min-h-[200px] focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[180px] [&_.tiptap_table]:border-collapse [&_.tiptap_table]:w-full [&_.tiptap_table_td]:border [&_.tiptap_table_td]:border-border [&_.tiptap_table_td]:p-2 [&_.tiptap_table_th]:border [&_.tiptap_table_th]:border-border [&_.tiptap_table_th]:p-2 [&_.tiptap_table_th]:bg-muted/50 [&_.tiptap_table_th]:font-semibold [&_.selectedCell]:bg-primary/10" />
    </div>
  );
}
