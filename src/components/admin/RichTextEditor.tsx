import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState, useCallback } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ImageIcon, LinkIcon, Youtube as YoutubeIcon, Quote, Code,
  Undo, Redo, Upload, Loader2, Palette, RemoveFormatting, Highlighter,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
      }),
      Image,
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({ width: 640, height: 360 }),
      Color,
      Highlight.configure({ multicolor: true }),
      TextStyle,
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
    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ hỗ trợ ảnh JPG, PNG, GIF, WEBP");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("editor-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("editor-images")
        .getPublicUrl(filePath);

      editor.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err: any) {
      alert("Upload thất bại: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addLink = () => {
    const url = prompt("Link URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = prompt("YouTube URL:");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />
      <div className="flex flex-wrap gap-0.5 border-b p-1 bg-muted/30">
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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
              title="Màu chữ"
            >
              <Palette className="h-3.5 w-3.5" style={{ color: editor.getAttributes("textStyle").color || undefined }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-8 gap-1">
              {[
                "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#ffffff",
                "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0",
                "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79",
                "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47",
              ].map((color) => (
                <button
                  key={color}
                  className="h-5 w-5 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 h-7 text-xs"
              onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              <RemoveFormatting className="h-3 w-3 mr-1" /> Xóa màu
            </Button>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("highlight") ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
              title="Highlight"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {[
                "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa",
                "#fde047", "#86efac", "#93c5fd", "#fca5a5", "#d8b4fe", "#fdba74",
              ].map((color) => (
                <button
                  key={color}
                  className="h-5 w-5 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 h-7 text-xs"
              onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              <RemoveFormatting className="h-3 w-3 mr-1" /> Xóa highlight
            </Button>
          </PopoverContent>
        </Popover>
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive("heading", { level: 4 })} title="H4">
          <Heading4 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload ảnh" disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Image URL">
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="YouTube">
          <YoutubeIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px bg-border mx-0.5" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="prose prose-sm prose-neutral dark:prose-invert max-w-none p-3 min-h-[200px] focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[180px]" />
    </div>
  );
}
