/**
 * Shared client-side export helpers.
 *
 * Extracted from the near-identical CSV/JSON "build blob -> create <a> ->
 * click -> revoke" snippet that was previously duplicated inline in
 * AdminUsers, AdminTools, AdminReviews, AdminReports, AdminTasks, AdminBlog,
 * AdminAuditLogs, AdminSearchAnalytics (CSV) and AdminMenus, AdminTranslations,
 * AdminAnalytics (JSON).
 */

/** Triggers a browser download for the given Blob content. */
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Escapes a single CSV cell value (wraps in quotes, doubles inner quotes). */
function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/**
 * Builds a CSV string from headers + row arrays and triggers a download.
 * Equivalent to the previous inline pattern:
 *   const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
 */
export function exportToCSV(headers: string[], rows: unknown[][], filename: string) {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  downloadBlob(csv, filename, "text/csv");
}

/** Downloads a pre-built array of CSV line strings (for callers that already format their own rows). */
export function exportCSVLines(lines: string[], filename: string) {
  downloadBlob(lines.join("\n"), filename, "text/csv");
}

/** Pretty-prints a JS value as JSON and triggers a download. */
export function exportToJSON(data: unknown, filename: string) {
  downloadBlob(JSON.stringify(data, null, 2), filename, "application/json");
}

/** Convenience: builds a "<prefix>-YYYY-MM-DD.<ext>" filename using today's date. */
export function dateStampedFilename(prefix: string, ext: "csv" | "json") {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}
