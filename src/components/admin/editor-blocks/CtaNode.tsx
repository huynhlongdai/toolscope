import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, ArrowUpRight } from "lucide-react";

/**
 * Tiptap node for the inline CTA block.
 *
 * An **atom**: it has no editable body, because its content is two discrete
 * values (destination, label) rather than prose. The NodeView edits them in
 * place so the author never has to hand-write HTML.
 *
 * Note what is deliberately *absent* here: `rel="sponsored"` and the FTC
 * disclosure text. Those are applied by `<CtaButton>` at render time rather
 * than baked into the stored markup — so every existing CTA picks up a
 * compliance fix automatically, instead of each one carrying a frozen copy the
 * author would have to revisit.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ctaBlock: {
      setCtaBlock: (attrs?: { href?: string; label?: string }) => ReturnType;
    };
  }
}

function CtaView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const { href, label, sponsored } = node.attrs as {
    href: string;
    label: string;
    sponsored: string;
  };
  const isSponsored = sponsored !== "false";

  if (!editor.isEditable) {
    return (
      <NodeViewWrapper className="not-prose my-6" data-block="cta">
        <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
          {label || "Xem chi tiết"}
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="not-prose my-6" data-block="cta">
      <div className="rounded-lg border-2 border-dashed border-primary/40 p-3" contentEditable={false}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nút CTA {isSponsored ? "(affiliate)" : "(thường)"}
          </span>
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={isSponsored}
                onChange={(e) => updateAttributes({ sponsored: e.target.checked ? "true" : "false" })}
              />
              Affiliate
            </label>
            <button
              type="button"
              onClick={deleteNode}
              className="rounded border p-1 text-muted-foreground hover:text-destructive"
              title="Xoá CTA"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={label || ""}
            onChange={(e) => updateAttributes({ label: e.target.value })}
            placeholder="Nhãn nút, ví dụ: Dùng thử Jasper miễn phí"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm"
          />
          <input
            value={href || ""}
            onChange={(e) => updateAttributes({ href: e.target.value })}
            placeholder="https://... (link affiliate)"
            className="w-full rounded border bg-background px-2 py-1.5 text-sm"
          />
        </div>

        {/* A CTA with no destination renders as nothing on the public page, so
            say so here rather than letting the author discover it after
            publishing. */}
        {!href && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Chưa có link — nút này sẽ không hiển thị trên trang.
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const CtaNode = Node.create({
  name: "ctaBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      href: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-href") || "",
        renderHTML: (attributes) => ({ "data-href": attributes.href }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-label") || "",
        renderHTML: (attributes) => ({ "data-label": attributes.label }),
      },
      sponsored: {
        default: "true",
        parseHTML: (element) => element.getAttribute("data-sponsored") || "true",
        renderHTML: (attributes) => ({ "data-sponsored": attributes.sponsored }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block="cta"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "cta" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaView);
  },

  addCommands() {
    return {
      setCtaBlock:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
