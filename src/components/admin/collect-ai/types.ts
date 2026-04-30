export type CollectItem = {
  id: string;
  session_id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  pricing_type: string | null;
  category_name: string | null;
  source_url: string | null;
  status: string;
  imported_tool_id: string | null;
  created_at: string;
};

export type CollectSession = {
  id: string;
  search_type: string;
  query: string;
  results_count: number;
  status: string;
  created_at: string;
  metadata: any;
};

export type CollectSchedule = {
  id: string;
  keyword: string;
  search_type: string;
  category_id: string | null;
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  results_total: number;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export const CRON_PRESETS = [
  { label: "Mỗi ngày (8h sáng)", value: "0 8 * * *" },
  { label: "Mỗi tuần (Thứ 2)", value: "0 8 * * 1" },
  { label: "Mỗi 3 ngày", value: "0 8 */3 * *" },
  { label: "Mỗi tháng (ngày 1)", value: "0 8 1 * *" },
];
