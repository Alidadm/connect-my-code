import React, { useState } from "react";
import { 
  Search, Star, Settings, Users, MessageCircle, Bell, Plus, 
  MoreHorizontal, Filter, LayoutGrid, Table, List, ChevronRight, ChevronDown,
  Folder, Home, Calendar, FileText, Send, Mic, Phone, Video, X,
  Play, Clock, Link2, PanelLeftClose, PanelLeft, LayoutDashboard, ListOrdered, AlertTriangle, Mail,
  Shield, CreditCard, BarChart3, Layers, Megaphone, Lock, Code, UserCog, Database, Flag, Wallet
} from "lucide-react";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Demo data
const favoriteProjects = [
  { name: "Member Home", starred: true, path: "/" },
  { name: "Member List", starred: true, path: "/admin/users/list" },
  { name: "Content Moderation", starred: true },
  { name: "Payouts", starred: true, path: "/admin/payouts", icon: "paypal" },
];

const userManagementMenu = [
  { name: "User Dashboard", icon: LayoutDashboard, path: "/admin/users/dashboard" },
  { name: "User List", icon: ListOrdered, path: "/admin/users/list" },
  { name: "User Alert", icon: AlertTriangle, path: "/admin/users/alerts" },
  { name: "Email Templates", icon: Mail, path: "/admin/email-templates" },
];

const adminMenuSections = [
  {
    title: "Reports & Safety Tools",
    icon: Flag,
    items: [
      { name: "Content Reports", path: "/admin/reports" },
      { name: "User Reports", path: "/admin/user-reports" },
      { name: "Safety Dashboard", path: "/admin/safety" },
    ],
  },
  {
    title: "Payments & Financial Controls",
    icon: CreditCard,
    items: [
      { name: "Transactions", path: "/admin/transactions" },
      { name: "Subscriptions", path: "/admin/subscriptions" },
      { name: "Refunds", path: "/admin/refunds" },
      { name: "Commission Payouts", path: "/admin/payouts" },
    ],
  },
  {
    title: "Analytics & Insights",
    icon: BarChart3,
    items: [
      { name: "User Analytics", path: "/admin/analytics/users" },
      { name: "Content Analytics", path: "/admin/analytics/content" },
      { name: "Revenue Reports", path: "/admin/analytics/revenue" },
    ],
  },
  {
    title: "Platform Structure & Content Types",
    icon: Layers,
    items: [
      { name: "Categories", path: "/admin/categories" },
      { name: "Topics", path: "/admin/topics" },
      { name: "Content Types", path: "/admin/content-types" },
    ],
  },
  {
    title: "Advertising & Monetization Controls",
    icon: Megaphone,
    items: [
      { name: "Ad Campaigns", path: "/admin/ads/campaigns" },
      { name: "Ad Placements", path: "/admin/ads/placements" },
      { name: "Monetization Settings", path: "/admin/monetization" },
    ],
  },
  {
    title: "Security & Compliance",
    icon: Lock,
    items: [
      { name: "Security Logs", path: "/admin/security/logs" },
      { name: "IP Blocks", path: "/admin/security/ip-blocks" },
      { name: "Compliance Reports", path: "/admin/compliance" },
    ],
  },
  {
    title: "Developer & System Tools",
    icon: Code,
    items: [
      { name: "API Logs", path: "/admin/developer/api-logs" },
      { name: "Webhooks", path: "/admin/developer/webhooks" },
      { name: "System Health", path: "/admin/system/health" },
    ],
  },
  {
    title: "Admin Roles & Permissions",
    icon: UserCog,
    items: [
      { name: "Role Management", path: "/admin/roles" },
      { name: "Permission Settings", path: "/admin/permissions" },
      { name: "Admin Activity Log", path: "/admin/activity" },
    ],
  },
  {
    title: "Data Management",
    icon: Database,
    items: [
      { name: "Data Export", path: "/admin/data/export" },
      { name: "Data Import", path: "/admin/data/import" },
      { name: "Backup & Restore", path: "/admin/data/backup" },
    ],
  },
];

const tasks = {
  newRequest: [
    {
      id: 1,
      title: 'Pages "About" and "Careers"',
      description: "All the details are in the file, I'm sure it will turn out cool!",
      tags: [{ label: "Website", color: "bg-emerald-500" }, { label: "Design", color: "bg-amber-500" }],
      subtasks: ["About", "Careers"],
      hasImage: false,
    },
    {
      id: 2,
      title: "Presentation for Dribbble",
      description: "Approved the design of the iOS app, let's make a presentation.",
      tags: [{ label: "Dribbble", color: "bg-pink-500" }, { label: "Design", color: "bg-amber-500" }],
      avatars: 4,
      comments: 2,
      attachments: 14,
      hasImage: true,
    },
    {
      id: 3,
      title: "Home page bugs fixes",
      description: "I found several mistakes. Made a list, attached it below",
      tags: [{ label: "Website", color: "bg-emerald-500" }, { label: "Frontend", color: "bg-orange-500" }],
    },
  ],
  inProgress: [
    {
      id: 4,
      title: "Secret Marketing Page",
      description: "We need to make a page for a special offer for the most loyal customers",
      tags: [{ label: "Website", color: "bg-emerald-500" }, { label: "Design", color: "bg-amber-500" }],
      subtasks: ["Approved budget", "Initial design review", "First design concept", "Second design concept"],
      completedSubtasks: 1,
    },
    {
      id: 5,
      title: "Planning meeting for the second version of the app",
      description: "",
      tags: [{ label: "App", color: "bg-blue-500" }, { label: "Planning", color: "bg-purple-500" }],
      comments: 1,
    },
  ],
  complete: [
    {
      id: 6,
      title: "Second design concept",
      description: "Let's do the exact opposite of the first concept. Light theme, minimalism and lightness",
      tags: [{ label: "Website", color: "bg-emerald-500" }, { label: "Design", color: "bg-amber-500" }],
      comments: 18,
      attachments: 2,
    },
    {
      id: 7,
      title: "Do competitor research",
      description: "You need to research competitors and identify weaknesses and strengths each of them",
      tags: [{ label: "App", color: "bg-blue-500" }, { label: "Research", color: "bg-red-500" }],
      comments: 3,
      attachments: 2,
    },
    {
      id: 8,
      title: "First design concept",
      description: "Let's try a dark theme and bright colors for accents.",
      tags: [{ label: "Website", color: "bg-emerald-500" }, { label: "Design", color: "bg-amber-500" }],
      comments: 18,
      attachments: 2,
    },
    {
      id: 9,
      title: "Let's discuss the tasks and plan the timeline",
      description: "",
      tags: [{ label: "Website", color: "bg-emerald-500" }, { label: "Planning", color: "bg-purple-500" }],
    },
  ],
};

const chatMessages = [
  { id: 1, text: "Hi, I have great news. A new project is starting, I'll tell you more about it later.", time: "8:29", isOwn: false },
  { id: 2, text: "It's a new neobank with great deposit terms.", time: "8:30", isOwn: false },
  { id: 3, text: "Hi, wow, that's intriguing", time: "8:30", isOwn: true },
  { id: 4, text: "I'm looking forward to the details", time: "8:30", isOwn: true },
  { id: 5, text: "Okay, I can't wait to get started", time: "8:37", isOwn: true },
];

const AdminIndex = () => {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openMenuSections, setOpenMenuSections] = useState<string[]>([]);

  const toggleMenuSection = (title: string) => {
    setOpenMenuSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mini Icon Column */}
      <div className="w-16 bg-slate-900 flex flex-col items-center py-4 gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        
        <div className="flex-1 flex flex-col items-center gap-2 mt-4">
          <button className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
            <Home className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <LayoutGrid className="w-5 h-5 text-white" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
            <Calendar className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
            <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group relative">
            <Bell className="w-5 h-5 text-slate-400 group-hover:text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">3</span>
          </button>
          <button 
            onClick={() => navigate("/admin/payouts")}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group"
            title="Payouts"
          >
            <Wallet className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
            <Users className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group">
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
          <Avatar className="w-10 h-10 border-2 border-slate-700">
            <AvatarImage src="https://i.pravatar.cc/40?img=12" />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">AD</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Column 1: Left Sidebar - Navigation */}
      <div className={cn(
        "bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
        isSidebarOpen ? "w-64" : "w-0"
      )}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-[4.5rem] top-4 z-10 w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center justify-center transition-all"
          style={{ left: isSidebarOpen ? 'calc(4rem + 15.5rem)' : '4.5rem' }}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-slate-500" />
          ) : (
            <PanelLeft className="w-4 h-4 text-slate-500" />
          )}
        </button>
        {/* Logo & Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search..." 
              className="pl-9 bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
            />
          </div>
        </div>

        {/* Favorites */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Favorites</h3>
          <div className="space-y-1">
            {favoriteProjects.map((project) => (
              <button
                key={project.name}
                onClick={() => project.path && navigate(project.path)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700",
                  project.path && "text-blue-600 hover:bg-blue-50 font-medium"
                )}
              >
                {project.icon === "paypal" ? (
                  <Wallet className="w-4 h-4 text-green-500" />
                ) : (
                  <Star className={cn("w-4 h-4", project.path ? "text-blue-500 fill-blue-500" : "text-amber-400 fill-amber-400")} />
                )}
                {project.name}
              </button>
            ))}
            
            {/* User Management with submenu */}
            <div>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  User Management
                </div>
                {isUserMenuOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {isUserMenuOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                  {userManagementMenu.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 transition-colors text-sm text-slate-600 hover:text-purple-700"
                    >
                      <item.icon className="w-4 h-4 text-slate-400" />
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative">
            <LayoutGrid className="w-5 h-5 text-slate-500" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative">
            <MessageCircle className="w-5 h-5 text-slate-500" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">2</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5 text-slate-500" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Users className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Admin Menu Sections */}
        <ScrollArea className="flex-1 px-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Admin Tools</h3>
          <div className="space-y-1">
            {adminMenuSections.map((section) => {
              const isOpen = openMenuSections.includes(section.title);
              const SectionIcon = section.icon;
              return (
                <div key={section.title}>
                  <button
                    onClick={() => toggleMenuSection(section.title)}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon className="w-4 h-4 text-slate-500" />
                      <span className="text-left">{section.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                      {section.items.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => navigate(item.path)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors text-sm text-slate-600 hover:text-blue-700"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* New Project Button */}
        <div className="p-4 border-t border-slate-100">
          <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </div>

      {/* Column 2 & 3: Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded border-2 border-slate-300" />
              <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Search className="w-5 h-5 text-slate-500" />
              </Button>
              <Button variant="ghost" size="icon">
                <Star className="w-5 h-5 text-slate-500" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
          </div>

        </div>


        {/* Stats Cards + Kanban Board */}
        <div className="flex-1 overflow-x-auto p-6">
          {/* Admin Stats Cards */}
          <AdminStatsCards />
          
          <div className="flex gap-6 h-full">
            {/* New Request Column */}
            <div className="w-80 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400" />
                  <h3 className="font-semibold text-slate-700">New Request</h3>
                  <span className="text-slate-400 text-sm">6</span>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <button className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </button>
                {tasks.newRequest.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="w-80 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
                  <h3 className="font-semibold text-slate-700">In Progress</h3>
                  <span className="text-slate-400 text-sm">2</span>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <button className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </button>
                {tasks.inProgress.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* Complete Column */}
            <div className="w-80 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                  <h3 className="font-semibold text-slate-700">Complete</h3>
                  <span className="text-slate-400 text-sm">7</span>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {tasks.complete.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column 4: Sliding Chat Panel */}
      <div
        className={cn(
          "bg-white border-l border-slate-200 transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
          isChatOpen ? "w-80" : "w-0"
        )}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsChatOpen(false)}
            className="text-slate-500"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>


        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col",
                  msg.isOwn ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    msg.isOwn
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-700 rounded-bl-sm"
                  )}
                >
                  {msg.text}
                </div>
                <span className="text-xs text-slate-400 mt-1">{msg.time}</span>
              </div>
            ))}

            {/* Link Preview */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Link2 className="w-4 h-4" />
                <span className="font-medium">acorns.com</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">https://www.acorns.com/</p>
            </div>

            {/* Meeting Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Meeting</span>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <p className="font-semibold text-slate-700">Jul 28</p>
              <p className="text-slate-600">2:20 pm</p>
              <Button variant="outline" size="sm" className="w-full mt-3 border-slate-300">
                Add to Schedule
              </Button>
            </div>

            {/* Voice Message */}
            <div className="bg-slate-100 rounded-xl p-3 flex items-center gap-3">
              <Button size="icon" className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                <Play className="w-4 h-4 text-white fill-white" />
              </Button>
              <div className="flex-1 h-6 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
              </div>
              <span className="text-xs text-slate-500">1:42</span>
            </div>
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Write a message..." 
              className="flex-1 bg-slate-50 border-slate-200"
            />
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Mic className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Toggle Button for Chat Panel (when closed) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-2 rounded-l-lg shadow-lg hover:from-blue-600 hover:to-cyan-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      )}
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task }: { task: any }) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {task.tags.map((tag: any, idx: number) => (
          <span
            key={idx}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium text-white",
              tag.color
            )}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-slate-500 mb-3">{task.description}</p>
      )}

      {/* Subtasks */}
      {task.subtasks && (
        <div className="space-y-1.5 mb-3">
          {task.subtasks.map((subtask: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
              <div className={cn(
                "w-4 h-4 rounded-full border-2",
                task.completedSubtasks && idx < task.completedSubtasks 
                  ? "bg-emerald-500 border-emerald-500 flex items-center justify-center" 
                  : "border-slate-300"
              )}>
                {task.completedSubtasks && idx < task.completedSubtasks && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {subtask}
            </div>
          ))}
          {!task.completedSubtasks && (
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-500 transition-colors">
              <Plus className="w-4 h-4" />
              Add Subtask
            </button>
          )}
        </div>
      )}

      {/* Image placeholder */}
      {task.hasImage && (
        <div className="relative mb-3 rounded-lg overflow-hidden">
          <div className="w-full h-24 bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {(task.avatars || task.comments || task.attachments) && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {task.avatars && (
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(task.avatars, 3) }).map((_, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={`https://i.pravatar.cc/24?img=${i + 20}`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ))}
              {task.avatars > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-medium text-slate-600">
                  +{task.avatars - 3}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            {task.comments && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {task.comments}
              </span>
            )}
            {task.attachments && (
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {task.attachments}
              </span>
            )}
          </div>
        </div>
      )}

      {/* More options */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default AdminIndex;
