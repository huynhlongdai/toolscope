import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, Wrench, Users, MessageSquare, Shield, FileText, Tags, ChevronLeft,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";

import { Menu, FileStack, BrainCircuit, Workflow, SearchCheck, Tag, Rocket, ListChecks, Settings, AlertTriangle, History, Mail, Languages, Database, BarChart3, RefreshCw, KeyRound } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const navGroups = [
  {
    label: "Tổng quan",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { title: "Tools", url: "/admin/tools", icon: Wrench, badgeKey: "pendingTools" as const },
      { title: "CollectAI", url: "/admin/collect", icon: BrainCircuit },
      { title: "Blog Posts", url: "/admin/blog", icon: FileText, badgeKey: "pendingBlog" as const },
      { title: "Workflows", url: "/admin/workflows", icon: Workflow, badgeKey: "pendingWorkflows" as const },
      { title: "Categories & Tags", url: "/admin/categories", icon: Tags },
      { title: "Pages", url: "/admin/pages", icon: FileStack },
      { title: "Deals & Coupons", url: "/admin/deals", icon: Tag, badgeKey: "pendingDeals" as const },
      { title: "Launches", url: "/admin/launches", icon: Rocket, badgeKey: "pendingLaunches" as const },
      { title: "Tasks", url: "/admin/tasks", icon: ListChecks },
    ],
  },
  {
    label: "Cộng đồng",
    items: [
      // adminOnly: user/role management must stay out of an editor/AI-agent's reach
      { title: "Users", url: "/admin/users", icon: Users, adminOnly: true },
      { title: "Reviews", url: "/admin/reviews", icon: MessageSquare },
      { title: "Reports", url: "/admin/reports", icon: AlertTriangle, badgeKey: "pendingReports" as const },
      { title: "Moderation", url: "/admin/moderation", icon: Shield },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { title: "Menu Manager", url: "/admin/menus", icon: Menu },
      { title: "Newsletter", url: "/admin/newsletter", icon: Mail },
      { title: "Translations", url: "/admin/translations", icon: Languages },
      { title: "Search Analytics", url: "/admin/search-analytics", icon: SearchCheck },
      // adminOnly: these routes are gated admin-only in App.tsx (adminOnlyRoute) -
      // hide from editors' sidebar so it matches what they can actually access.
      { title: "Agent Tokens", url: "/admin/agent-tokens", icon: KeyRound, adminOnly: true },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: History, adminOnly: true },
      { title: "Backup", url: "/admin/backup", icon: Database, adminOnly: true },
      { title: "Sync", url: "/admin/sync", icon: RefreshCw, adminOnly: true },
      { title: "Cài đặt", url: "/admin/settings", icon: Settings, adminOnly: true },
    ],
  },
];

type BadgeCounts = {
  pendingTools: number;
  pendingLaunches: number;
  pendingReports: number;
  pendingBlog: number;
  pendingWorkflows: number;
  pendingDeals: number;
};

function useSidebarBadges() {
  return useQuery({
    queryKey: ["admin-sidebar-badges"],
    queryFn: async () => {
      const [tools, launches, reports, blog, workflows, deals] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("launches").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        // Editor-authored content awaiting an admin's publish_content() call -
        // see the 20260906040000 migration's content-approval RLS.
        supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("workflows").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        // deals has no content_status column - is_active=false is the closest
        // analog, but that also matches admin-deactivated/expired deals, so
        // this count is a rough "needs attention" signal rather than exact.
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_active", false),
      ]);
      return {
        pendingTools: tools.count || 0,
        pendingLaunches: launches.count || 0,
        pendingReports: reports.count || 0,
        pendingBlog: blog.count || 0,
        pendingWorkflows: workflows.count || 0,
        pendingDeals: deals.count || 0,
      } as BadgeCounts;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data: badges } = useSidebarBadges();
  const { isAdmin } = useAdminAuth();

  // Hide admin-only nav items (Users/Audit Logs/Backup/Sync/Settings) from
  // editors entirely - keeps the sidebar consistent with the adminOnlyRoute()
  // guards in App.tsx that already block direct navigation to these URLs.
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !(item as any).adminOnly || isAdmin),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-4">
            {!collapsed && (
              <Link to="/admin" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <span className="text-xs font-bold text-primary-foreground">T</span>
                </div>
                <span className="font-semibold text-sidebar-foreground">Admin</span>
              </Link>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  {!collapsed && (
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {group.label}
                    </p>
                  )}
                  {group.items.map((item) => {
                    const badgeCount = (item as any).badgeKey && badges ? badges[(item as any).badgeKey as keyof BadgeCounts] : 0;
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === "/admin"}
                            className="hover:bg-sidebar-accent flex items-center justify-between"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          >
                            <span className="flex items-center">
                              <item.icon className="mr-2 h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </span>
                            {!collapsed && badgeCount > 0 && (
                              <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
                                {badgeCount}
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" className="hover:bg-sidebar-accent">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Về trang chính</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function getPersistedSidebarState(): boolean {
  try {
    return localStorage.getItem("admin-sidebar-collapsed") === "true";
  } catch { return false; }
}

/**
 * NOTE: Route-level redirect/access checking is intentionally NOT done
 * here. Every admin page that renders <AdminLayout> is already wrapped
 * by <AdminGuard> in App.tsx's adminRoute()/adminOnlyRoute() helpers,
 * which perform the loading/redirect/role check exactly once before
 * this component ever mounts. See src/components/AdminGuard.tsx.
 *
 * AdminSidebar's own useAdminAuth() call (above) is only used to filter
 * which nav items are rendered (hide Users/Backup/Audit Logs/Sync/
 * Settings from editors) - it does not redirect. Because useAdminAuth()
 * is backed by a React Query cache keyed on the user id, this does not
 * trigger a duplicate network fetch beyond the one AdminGuard already
 * made.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const [defaultOpen] = useState(() => !getPersistedSidebarState());

  return (
    <SidebarProvider defaultOpen={defaultOpen} onOpenChange={(open) => {
      try { localStorage.setItem("admin-sidebar-collapsed", String(!open)); } catch {}
    }}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-3 md:px-4 bg-background">
            <SidebarTrigger className="mr-3" />
            <h1 className="text-sm font-medium text-muted-foreground truncate">Astute Tools Admin</h1>
          </header>
          <main className="flex-1 p-3 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
