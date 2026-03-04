import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ToolsPage from "./pages/ToolsPage";
import ToolDetail from "./pages/ToolDetail";
import CategoryPage from "./pages/CategoryPage";
import CategoriesPage from "./pages/CategoriesPage";
import NotFound from "./pages/NotFound";
import BlogPage from "./pages/BlogPage";
import BlogDetail from "./pages/BlogDetail";
import ComparePage from "./pages/ComparePage";
import CollectionsPage from "./pages/CollectionsPage";
import CollectionDetail from "./pages/CollectionDetail";
import TrendingPage from "./pages/TrendingPage";
import ProfilePage from "./pages/ProfilePage";
import BookmarksPage from "./pages/BookmarksPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import WorkflowDetail from "./pages/WorkflowDetail";
import { AIChatWidget } from "./components/chat/AIChatWidget";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTools from "./pages/admin/AdminTools";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminMenus from "./pages/admin/AdminMenus";
import AdminPages from "./pages/admin/AdminPages";
import AdminPageEditor from "./pages/admin/AdminPageEditor";
import AdminCollectAI from "./pages/admin/AdminCollectAI";
import AdminWorkflows from "./pages/admin/AdminWorkflows";
import AdminSearchAnalytics from "./pages/admin/AdminSearchAnalytics";
import AdminDeals from "./pages/admin/AdminDeals";
import DynamicPage from "./pages/DynamicPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import DealsPage from "./pages/DealsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/tool/:slug" element={<ToolDetail />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collection/:id" element={<CollectionDetail />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflow/:slug" element={<WorkflowDetail />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/p/:slug" element={<DynamicPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/tools" element={<AdminTools />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/moderation" element={<AdminModeration />} />
            <Route path="/admin/blog" element={<AdminBlog />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/menus" element={<AdminMenus />} />
            <Route path="/admin/pages" element={<AdminPages />} />
            <Route path="/admin/pages/:id" element={<AdminPageEditor />} />
            <Route path="/admin/collect" element={<AdminCollectAI />} />
            <Route path="/admin/workflows" element={<AdminWorkflows />} />
            <Route path="/admin/search-analytics" element={<AdminSearchAnalytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatWidget />
        </BrowserRouter>
        </I18nProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
