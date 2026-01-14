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
import MemberDashboard from "./pages/MemberDashboard";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

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
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/commissions" element={<Commissions />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/groups/:groupId/post/:postId" element={<GroupPostView />} />
            <Route path="/groups/:groupId/settings" element={<GroupSettings />} />
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/adminindex" element={<AdminIndex />} />
            <Route
              path="/admin/users/list"
              element={
                <AdminRouteGuard>
                  <UserList />
                </AdminRouteGuard>
              }
            />
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

