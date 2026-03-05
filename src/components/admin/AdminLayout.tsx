import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Wrench, Users, MessageSquare, Shield, FileText, Tags, BarChart3, LogOut, ChevronLeft,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Menu, FileStack, BrainCircuit, Workflow, SearchCheck, Tag, Rocket, ListChecks, Settings } from "lucide-react";

const navItems = [
  { title: "Tổng quan", url: "/admin", icon: LayoutDashboard },
  { title: "Quản lý Tools", url: "/admin/tools", icon: Wrench },
  { title: "CollectAI", url: "/admin/collect", icon: BrainCircuit },
  { title: "Quản lý Users", url: "/admin/users", icon: Users },
  { title: "Reviews", url: "/admin/reviews", icon: MessageSquare },
  { title: "Moderation", url: "/admin/moderation", icon: Shield },
  { title: "Blog Posts", url: "/admin/blog", icon: FileText },
  { title: "Workflows", url: "/admin/workflows", icon: Workflow },
  { title: "Categories & Tags", url: "/admin/categories", icon: Tags },
  { title: "Menu Manager", url: "/admin/menus", icon: Menu },
  { title: "Page Builder", url: "/admin/pages", icon: FileStack },
  { title: "Deals & Coupons", url: "/admin/deals", icon: Tag },
  { title: "Launches", url: "/admin/launches", icon: Rocket },
  { title: "Tasks", url: "/admin/tasks", icon: ListChecks },
  { title: "Search Analytics", url: "/admin/search-analytics", icon: SearchCheck },
  { title: "Cài đặt", url: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdminOrEditor, loading, user } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && user && !isAdminOrEditor) navigate("/");
  }, [loading, user, isAdminOrEditor, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isAdminOrEditor) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-background">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-sm font-medium text-muted-foreground">ToolScope Admin</h1>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
