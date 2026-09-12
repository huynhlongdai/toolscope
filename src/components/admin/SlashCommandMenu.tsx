import { Editor, Range } from "@tiptap/core";
import { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  Image as ImageIcon, Minus, Table as TableIcon, AlertCircle, AlertTriangle,
  CheckCircle2, Info, HelpCircle, Plus, Minus as MinusIcon, Star,
} from "lucide-react";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: Editor; range: Range }) => void;
}

const getSlashCommands = (): SlashCommandItem[] => [
  {
    title: "Paragraph",
    description: "Đoạn văn bản thường",
    icon: <Type className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Heading 1",
    description: "Tiêu đề lớn",
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Tiêu đề vừa",
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Tiêu đề nhỏ",
    icon: <Heading3 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Danh sách không thứ tự",
    icon: <List className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Ordered List",
    description: "Danh sách có thứ tự",
    icon: <ListOrdered className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Trích dẫn nổi bật",
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Hiển thị mã nguồn",
    icon: <Code className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Đường phân cách",
    icon: <Minus className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Info Callout",
    description: "Hộp thông tin (xanh)",
    icon: <Info className="h-4 w-4 text-blue-600" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          '<div class="callout callout-info" style="background:#dbeafe;border-left:4px solid #3b82f6;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>ℹ️ Thông tin:</strong> Nội dung thông tin ở đây...</p></div>'
        )
        .run();
    },
  },
  {
    title: "Warning Callout",
    description: "Hộp cảnh báo (vàng)",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          '<div class="callout callout-warning" style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>⚠️ Cảnh báo:</strong> Nội dung cảnh báo ở đây...</p></div>'
        )
        .run();
    },
  },
  {
    title: "Success Callout",
    description: "Hộp thành công (xanh lá)",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          '<div class="callout callout-success" style="background:#d1fae5;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>✅ Thành công:</strong> Nội dung thành công ở đây...</p></div>'
        )
        .run();
    },
  },
  {
    title: "Error Callout",
    description: "Hộp lỗi (đỏ)",
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          '<div class="callout callout-error" style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;margin:16px 0;border-radius:6px;"><p style="margin:0;"><strong>❌ Lỗi:</strong> Nội dung lỗi ở đây...</p></div>'
        )
        .run();
    },
  },
  {
    title: "FAQ Block",
    description: "Câu hỏi thường gặp",
    icon: <HelpCircle className="h-4 w-4 text-purple-600" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          '<div class="faq-block" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;background:#f9fafb;"><h4 style="margin:0 0 8px 0;font-weight:600;color:#1f2937;">❓ Câu hỏi thường gặp</h4><details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:500;">Câu hỏi 1?</summary><p style="margin:8px 0 0 0;">Câu trả lời 1...</p></details><details><summary style="cursor:pointer;font-weight:500;">Câu hỏi 2?</summary><p style="margin:8px 0 0 0;">Câu trả lời 2...</p></details></div>'
        )
        .run();
    },
  },
  {
    title: "Pros & Cons",
    description: "Ưu và nhược điểm",
    icon: <div className="flex gap-0.5"><Plus className="h-3 w-3 text-green-600" /><MinusIcon className="h-3 w-3 text-red-600" /></div>,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          '<div class="pros-cons" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;"><div style="border:2px solid #10b981;border-radius:8px;padding:16px;"><h4 style="margin:0 0 12px 0;color:#10b981;font-weight:600;">✅ Ưu điểm</h4><ul style="margin:0;padding-left:20px;"><li>Ưu điểm 1</li><li>Ưu điểm 2</li></ul></div><div style="border:2px solid #ef4444;border-radius:8px;padding:16px;"><h4 style="margin:0 0 12px 0;color:#ef4444;font-weight:600;">❌ Nhược điểm</h4><ul style="margin:0;padding-left:20px;"><li>Nhược điểm 1</li><li>Nhược điểm 2</li></ul></div></div>'
        )
        .run();
    },
  },
  {
    title: "Rating",
    description: "Đánh giá sao",
    icon: <Star className="h-4 w-4 text-yellow-500" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
          '<div class="rating-block" style="text-align:center;padding:16px;margin:16px 0;background:#f9fafb;border-radius:8px;"><div style="font-size:24px;color:#fbbf24;margin-bottom:8px;">★★★★★</div><p style="margin:0;font-weight:600;">Đánh giá: 5/5</p><p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">Mô tả đánh giá...</p></div>'
        )
        .run();
    },
  },
];

interface SlashCommandMenuProps extends SuggestionProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandMenu = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SlashCommandMenuProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="z-50 min-w-[280px] max-w-[400px] rounded-md border bg-popover shadow-md">
      <div className="max-h-[300px] overflow-y-auto p-1">
        {props.items.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy...</div>
        ) : (
          props.items.map((item, index) => (
            <button
              key={item.title}
              onClick={() => selectItem(index)}
              className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                {item.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";

export const slashCommandExtension = {
  char: "/",
  items: ({ query }: { query: string }) => {
    return getSlashCommands().filter((item) =>
      item.title.toLowerCase().startsWith(query.toLowerCase())
    );
  },
  render: () => {
    let menu: any;
    return {
      onStart: (props: any) => {
        menu = SlashCommandMenu;
        // @ts-ignore
        menu = {
          ...props,
          items: props.items,
          command: props.command,
        };
      },
      onUpdate: (props: any) => {
        menu = {
          ...menu,
          ...props,
        };
      },
      onKeyDown: (props: any) => {
        if (props.event.key === "Escape") {
          props.editor.commands.focus();
          return true;
        }
        return false;
      },
      onExit: () => {
        menu = null;
      },
    };
  },
};
