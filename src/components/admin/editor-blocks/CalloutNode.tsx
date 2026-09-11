import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { CALLOUT_VARIANT_STYLES } from "@/components/content/blocks/Callout";
import { CALLOUT_VARIANTS, isCalloutVariant } from "@/lib/content-blocks";
import { Trash2 } from "lucide-react";

/**
 * Tiptap node for the callout block.
 *
 * Serializes to the same `data-block="callout"` HTML the public renderer maps
 * back to `<Callout>`, and the NodeView reuses `CALLOUT_VARIANT_STYLES` so the
 * editor and the live page are styled from one definition.
 *
 * `content: "block+"` keeps the body a real editable region — the author types
 * paragraphs and lists inside a callout exactly as they would anywhere else,
 * rather than filling in a form field.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: string) => ReturnType;
    };
  }
}

function CalloutView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const raw = node.attrs.variant as string | undefined;
  const variant = isCalloutVariant(raw) ? raw : "info";
  const { wrapper, icon, Icon } = CALLOUT_VARIANT_STYLES[variant];

  return (
    <NodeViewWrapper
      className={`not-prose relative my-6 flex gap-3 rounded-lg border-l-4 p-4 sm:p-5 ${wrapper}`}
      data-block="callout"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} aria-hidden="true" />

      <NodeViewContent className="prose prose-sm prose-neutral dark:prose-invert max-w-none flex-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />

      {/* Controls are editor-only chrome and must never reach the saved HTML,
          which is why they live in the NodeView and not in renderHTML. */}
      {editor.isEditable && (
        <div className="absolute right-2 top-2 flex items-center gap-1" contentEditable={false}>
          <select
            value={variant}
            onChange={(e) => updateAttributes({ variant: e.target.value })}
            className="rounded border bg-background/80 px-1.5 py-0.5 text-xs"
            title="Kiểu callout"
          >
            {CALLOUT_VARIANTS.map((v) => (
              <option key={v} value={v}>
                {CALLOUT_VARIANT_STYLES[v].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={deleteNode}
            className="rounded border bg-background/80 p-1 text-muted-foreground hover:text-destructive"
            title="Xoá callout"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-variant") || "info",
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "callout" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (variant = "info") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
    };
  },
});
