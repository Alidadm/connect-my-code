import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "@/hooks/useAuth";
import { GameSidebarVisibilityProvider } from "@/hooks/useGameSidebarVisibility";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import { adminI18n } from "@/lib/adminI18n";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Commissions from "./pages/Commissions";
import Saved from "./pages/Saved";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import GroupPostView from "./pages/GroupPostView";
import GroupSettings from "./pages/GroupSettings";
import AdminIndex from "./pages/AdminIndex";
import UserList from "./pages/admin/UserList";
import EmailTemplates from "./pages/admin/EmailTemplates";
import LegalPagesEditor from "./pages/admin/LegalPagesEditor";
import PayoutManagement from "./pages/admin/PayoutManagement";
import PlatformPosts from "./pages/admin/PlatformPosts";
import ShortVideos from "./pages/admin/ShortVideos";
import DataCleanup from "./pages/admin/DataCleanup";
import ReportedPosts from "./pages/admin/ReportedPosts";
import MemberDashboard from "./pages/MemberDashboard";
import UserProfile from "./pages/UserProfile";
import ConfirmEmail from "./pages/ConfirmEmail";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import BusinessProfile from "./pages/BusinessProfile";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import HelpSupport from "./pages/HelpSupport";
import Feedback from "./pages/Feedback";
import Games from "./pages/Games";
import Blogs from "./pages/Blogs";
import BlogEdit from "./pages/BlogEdit";
import BlogView from "./pages/BlogView";
import About from "./pages/About";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiesPolicy from "./pages/CookiesPolicy";

const queryClient = new QueryClient();

// Root layout component that wraps all routes with providers
const RootLayout = () => (
  <AuthProvider>
    <GameSidebarVisibilityProvider>
      <OnboardingWrapper>
        <Outlet />
      </OnboardingWrapper>
    </GameSidebarVisibilityProvider>
  </AuthProvider>
);

// Admin layout wrapper
const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={adminI18n}>
    <AdminRouteGuard>{children}</AdminRouteGuard>
  </I18nextProvider>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Index /> },
      { path: "/about", element: <About /> },
      { path: "/friends", element: <Friends /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/commissions", element: <Commissions /> },
      { path: "/commissions", element: <Commissions /> },
      { path: "/saved", element: <Saved /> },
      { path: "/games", element: <Games /> },
      { path: "/blogs", element: <Blogs /> },
      { path: "/blogs/new", element: <BlogEdit /> },
      { path: "/blogs/edit/:blogId", element: <BlogEdit /> },
      { path: "/blogs/:blogId", element: <BlogView /> },
      { path: "/groups", element: <Groups /> },
      { path: "/groups/:groupId", element: <GroupDetail /> },
      { path: "/groups/:groupId/post/:postId", element: <GroupPostView /> },
      { path: "/groups/:groupId/settings", element: <GroupSettings /> },
      { path: "/dashboard", element: <MemberDashboard /> },
      { path: "/settings", element: <Settings /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/help", element: <HelpSupport /> },
      { path: "/feedback", element: <Feedback /> },
      { path: "/adminindex", element: <AdminLayout><AdminIndex /></AdminLayout> },
      { path: "/admin/users/list", element: <AdminLayout><UserList /></AdminLayout> },
      { path: "/admin/email-templates", element: <AdminLayout><EmailTemplates /></AdminLayout> },
      { path: "/admin/payouts", element: <AdminLayout><PayoutManagement /></AdminLayout> },
      { path: "/admin/platform-posts", element: <AdminLayout><PlatformPosts /></AdminLayout> },
      { path: "/admin/short-videos", element: <AdminLayout><ShortVideos /></AdminLayout> },
      { path: "/admin/legal-pages", element: <AdminLayout><LegalPagesEditor /></AdminLayout> },
      { path: "/admin/data-cleanup", element: <AdminLayout><DataCleanup /></AdminLayout> },
      { path: "/admin/reported-posts", element: <AdminLayout><ReportedPosts /></AdminLayout> },
      { path: "/terms", element: <Terms /> },
      { path: "/privacy-policy", element: <PrivacyPolicy /> },
      { path: "/cookies-policy", element: <CookiesPolicy /> },
      { path: "/confirm-email", element: <ConfirmEmail /> },
      { path: "/verify-email", element: <VerifyEmail /> },
      { path: "/business/:businessId", element: <BusinessProfile /> },
      { path: "/:username", element: <UserProfile /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
