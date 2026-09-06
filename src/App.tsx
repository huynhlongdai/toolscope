import { lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminGuard } from "@/components/AdminGuard";
import { PageSuspense } from "@/components/PageSuspense";
import { AnalyticsProvider } from "./components/analytics/AnalyticsProvider";
import { useModules } from "./hooks/useModules";

// ── Lazy-loaded public pages ─────────────────────────────────────────
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ToolsPage = lazy(() => import("./pages/ToolsPage"));
const ToolDetail = lazy(() => import("./pages/ToolDetail"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const TrendingPage = lazy(() => import("./pages/TrendingPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"));
const WorkflowsPage = lazy(() => import("./pages/WorkflowsPage"));
const WorkflowDetail = lazy(() => import("./pages/WorkflowDetail"));
const DynamicPage = lazy(() => import("./pages/DynamicPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const LaunchesPage = lazy(() => import("./pages/LaunchesPage"));
const LaunchDetailPage = lazy(() => import("./pages/LaunchDetailPage"));
const SubmitToolPage = lazy(() => import("./pages/SubmitToolPage"));

// ── Lazy-loaded admin pages (separate chunk) ─────────────────────────
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminTools = lazy(() => import("./pages/admin/AdminTools"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminMenus = lazy(() => import("./pages/admin/AdminMenus"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminPageEditor = lazy(() => import("./pages/admin/AdminPageEditor"));
const AdminCollectAI = lazy(() => import("./pages/admin/AdminCollectAI"));
const AdminWorkflows = lazy(() => import("./pages/admin/AdminWorkflows"));
const AdminSearchAnalytics = lazy(() => import("./pages/admin/AdminSearchAnalytics"));
const AdminDeals = lazy(() => import("./pages/admin/AdminDeals"));
const AdminLaunches = lazy(() => import("./pages/admin/AdminLaunches"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminTranslations = lazy(() => import("./pages/admin/AdminTranslations"));
const AdminBackup = lazy(() => import("./pages/admin/AdminBackup"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSync = lazy(() => import("./pages/admin/AdminSync"));

// ── Lazy-loaded heavy components ─────────────────────────────────────
const AIChatWidget = lazy(() =>
  import("./components/chat/AIChatWidget").then((m) => ({ default: m.AIChatWidget }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Maps module IDs to their public routes */
const MODULE_ROUTES: Record<string, Array<{ path: string; element: React.ReactNode }>> = {
  blog: [
    { path: "/blog", element: <BlogPage /> },
    { path: "/blog/:slug", element: <BlogDetail /> },
  ],
  workflows: [
    { path: "/workflows", element: <WorkflowsPage /> },
    { path: "/workflow/:slug", element: <WorkflowDetail /> },
  ],
  deals: [
    { path: "/deals", element: <DealsPage /> },
  ],
  launches: [
    { path: "/launches", element: <LaunchesPage /> },
    { path: "/launch/:id", element: <LaunchDetailPage /> },
  ],
  tasks: [
    { path: "/tasks", element: <TasksPage /> },
  ],
  collections: [
    { path: "/collections", element: <CollectionsPage /> },
    { path: "/collection/:id", element: <CollectionDetail /> },
  ],
  compare: [
    { path: "/compare", element: <ComparePage /> },
  ],
  leaderboard: [
    { path: "/leaderboard", element: <LeaderboardPage /> },
  ],
  submit_tool: [
    { path: "/submit", element: <SubmitToolPage /> },
  ],
};

/** Wraps admin element with auth guard (admin OR editor allowed) */
function adminRoute(element: React.ReactNode) {
  return <AdminGuard>{element}</AdminGuard>;
}

/**
 * Wraps admin element with a STRICTER auth guard: only admins may pass,
 * editors are redirected to /admin. Use for sensitive routes that must
 * stay out of an editor/AI-agent's reach: Settings, Users, Backup,
 * Audit Logs, Sync.
 */
function adminOnlyRoute(element: React.ReactNode) {
  return <AdminGuard adminOnly>{element}</AdminGuard>;
}

function AppRoutes() {
  const { isEnabled } = useModules();

  return (
    <>
      <Routes>
        {/* Always-on routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tool/:slug" element={<ToolDetail />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/p/:slug" element={<DynamicPage />} />

        {/* Module-gated routes */}
        {Object.entries(MODULE_ROUTES).map(([moduleId, routes]) =>
          isEnabled(moduleId)
            ? routes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)
            : routes.map((r) => <Route key={r.path} path={r.path} element={<NotFound />} />)
        )}

        {/* Admin routes (guarded) */}
        <Route path="/admin" element={adminRoute(<AdminDashboard />)} />
        <Route path="/admin/tools" element={adminRoute(<AdminTools />)} />
        <Route path="/admin/users" element={adminOnlyRoute(<AdminUsers />)} />
        <Route path="/admin/reviews" element={adminRoute(<AdminReviews />)} />
        <Route path="/admin/moderation" element={adminRoute(<AdminModeration />)} />
        <Route path="/admin/blog" element={adminRoute(<AdminBlog />)} />
        <Route path="/admin/categories" element={adminRoute(<AdminCategories />)} />
        <Route path="/admin/menus" element={adminRoute(<AdminMenus />)} />
        <Route path="/admin/pages" element={adminRoute(<AdminPages />)} />
        <Route path="/admin/pages/:id" element={adminRoute(<AdminPageEditor />)} />
        <Route path="/admin/collect" element={adminRoute(<AdminCollectAI />)} />
        <Route path="/admin/workflows" element={adminRoute(<AdminWorkflows />)} />
        <Route path="/admin/search-analytics" element={adminRoute(<AdminSearchAnalytics />)} />
        <Route path="/admin/deals" element={adminRoute(<AdminDeals />)} />
        <Route path="/admin/launches" element={adminRoute(<AdminLaunches />)} />
        <Route path="/admin/tasks" element={adminRoute(<AdminTasks />)} />
        <Route path="/admin/settings" element={adminOnlyRoute(<AdminSettings />)} />
        <Route path="/admin/reports" element={adminRoute(<AdminReports />)} />
        <Route path="/admin/audit-logs" element={adminOnlyRoute(<AdminAuditLogs />)} />
        <Route path="/admin/newsletter" element={adminRoute(<AdminNewsletter />)} />
        <Route path="/admin/translations" element={adminRoute(<AdminTranslations />)} />
        <Route path="/admin/backup" element={adminOnlyRoute(<AdminBackup />)} />
        <Route path="/admin/analytics" element={adminRoute(<AdminAnalytics />)} />
        <Route path="/admin/sync" element={adminOnlyRoute(<AdminSync />)} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AnalyticsProvider />
      {isEnabled("ai_chat") && (
        <PageSuspense>
          <AIChatWidget />
        </PageSuspense>
      )}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <I18nProvider>
          <ErrorBoundary>
            <Sonner />
            <BrowserRouter>
              <PageSuspense>
                <AppRoutes />
              </PageSuspense>
            </BrowserRouter>
          </ErrorBoundary>
        </I18nProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
