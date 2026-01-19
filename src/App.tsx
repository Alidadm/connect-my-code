import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Commissions from "./pages/Commissions";
import Saved from "./pages/Saved";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import GroupPostView from "./pages/GroupPostView";
import GroupSettings from "./pages/GroupSettings";
import AdminIndex from "./pages/AdminIndex";
import UserList from "./pages/admin/UserList";
import EmailTemplates from "./pages/admin/EmailTemplates";
import PayoutManagement from "./pages/admin/PayoutManagement";
import PlatformPosts from "./pages/admin/PlatformPosts";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/commissions" element={<Commissions />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/games" element={<Games />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/new" element={<BlogEdit />} />
            <Route path="/blogs/edit/:blogId" element={<BlogEdit />} />
            <Route path="/blogs/:blogId" element={<BlogView />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/groups/:groupId/post/:postId" element={<GroupPostView />} />
            <Route path="/groups/:groupId/settings" element={<GroupSettings />} />
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<HelpSupport />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route
              path="/adminindex"
              element={
                <AdminRouteGuard>
                  <AdminIndex />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/admin/users/list"
              element={
                <AdminRouteGuard>
                  <UserList />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/admin/email-templates"
              element={
                <AdminRouteGuard>
                  <EmailTemplates />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/admin/payouts"
              element={
                <AdminRouteGuard>
                  <PayoutManagement />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/admin/platform-posts"
              element={
                <AdminRouteGuard>
                  <PlatformPosts />
                </AdminRouteGuard>
              }
            />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            {/* Public business profile route */}
            <Route path="/business/:businessId" element={<BusinessProfile />} />
            {/* Public profile route - must be BEFORE the catch-all */}
            <Route path="/:username" element={<UserProfile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

