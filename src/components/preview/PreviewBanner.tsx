import { Eye } from "lucide-react";
import { useEffect } from "react";

interface PreviewBannerProps {
  /** e.g. "draft" | "pending_review" | "archived" | "inactive" */
  status: string;
  /** Optional extra note, e.g. "Chỉ admin/editor xem được link này" */
  note?: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp (Draft)",
  pending_review: "Đang chờ duyệt (Pending Review)",
  archived: "Đã lưu trữ (Archived)",
  inactive: "Chưa kích hoạt (Inactive)",
};

/**
 * Sticky banner shown at the top of a public detail page when the content
 * being viewed is NOT actually live (draft/pending_review/inactive), and
 * the viewer is only seeing it because they're an admin/editor (RLS grants
 * SELECT on non-published rows to those roles - see migration
 * 20260911080000_editor_preview_rls.sql). Also injects a `noindex` meta tag
 * for the duration this banner is mounted, so a crawler that somehow hits
 * this URL while authenticated never indexes unpublished content.
 */
export function PreviewBanner({ status, note }: PreviewBannerProps) {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    meta.setAttribute("data-preview-noindex", "true");
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <Eye className="h-4 w-4 shrink-0" />
      <span>
        Đang xem bản Preview — trạng thái: <strong>{STATUS_LABEL[status] ?? status}</strong>.
        Nội dung này chưa hiển thị công khai.
        {note ? <span className="ml-1 opacity-80">({note})</span> : null}
      </span>
    </div>
  );
}
