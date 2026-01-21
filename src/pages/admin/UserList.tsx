import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Search, Filter, Download, Upload, Plus, MoreHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Edit, Trash2, Eye, Mail, Phone, ArrowUpDown, Loader2, AtSign, Calendar, X, Shield, ExternalLink
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

// Country name to ISO 2-letter code mapping for flag emojis
const countryToCode: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Argentina": "AR", "Australia": "AU",
  "Austria": "AT", "Bangladesh": "BD", "Belgium": "BE", "Brazil": "BR", "Canada": "CA",
  "Chile": "CL", "China": "CN", "Colombia": "CO", "Croatia": "HR", "Czech Republic": "CZ",
  "Denmark": "DK", "Egypt": "EG", "Finland": "FI", "France": "FR", "Germany": "DE",
  "Ghana": "GH", "Greece": "GR", "Hong Kong": "HK", "Hungary": "HU", "India": "IN",
  "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Israel": "IL",
  "Italy": "IT", "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE",
  "Kuwait": "KW", "Lebanon": "LB", "Malaysia": "MY", "Mexico": "MX", "Morocco": "MA",
  "Netherlands": "NL", "New Zealand": "NZ", "Nigeria": "NG", "Norway": "NO", "Pakistan": "PK",
  "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA",
  "Romania": "RO", "Russia": "RU", "Saudi Arabia": "SA", "Serbia": "RS", "Singapore": "SG",
  "Slovakia": "SK", "South Africa": "ZA", "South Korea": "KR", "Spain": "ES", "Sri Lanka": "LK",
  "Sweden": "SE", "Switzerland": "CH", "Taiwan": "TW", "Thailand": "TH", "Turkey": "TR",
  "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
  "Venezuela": "VE", "Vietnam": "VN", "Czechia": "CZ", "Korea": "KR"
};

// Get flag image URL from country name
const getFlagUrl = (countryName: string): string | null => {
  if (!countryName || countryName === 'Unknown') return null;
  const code = countryToCode[countryName];
  if (!code) return null;
  // Use flagcdn.com for flag images (reliable CDN)
  return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type DatePreset = 'all' | 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

// User type definition matching database schema
type User = {
  id: string;
  user_id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  birthday: string;
  country: string;
  avatar: string;
  status: string;
  isAdmin?: boolean;
};

const UserList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filter state from URL params
  const filterParam = searchParams.get('filter') as DatePreset | null;
  
  // Date range state
  const [datePreset, setDatePreset] = useState<DatePreset>(filterParam || 'all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Request tracking ref to prevent race conditions
  const fetchRequestId = useRef(0);
  
  // Refresh trigger - increment to force a refetch
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Only trigger refetch on custom date changes (avoid object identity loops)
  const customRangeKey =
    datePreset === "custom"
      ? `${dateRange.from?.toISOString() ?? ""}|${dateRange.to?.toISOString() ?? ""}`
      : "";

  // Keep dateRange in sync for non-custom presets (used for UI display)
  useEffect(() => {
    if (datePreset === "custom") return;

    let next: DateRange = { from: undefined, to: undefined };

    switch (datePreset) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        next = { from: start, to: new Date() };
        break;
      }
      case "last7days":
        next = { from: subDays(new Date(), 7), to: new Date() };
        break;
      case "last30days":
        next = { from: subDays(new Date(), 30), to: new Date() };
        break;
      case "thisMonth":
        next = { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
        break;
      case "lastMonth": {
        const lastMonth = subMonths(new Date(), 1);
        next = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      }
      case "all":
      default:
        next = { from: undefined, to: undefined };
        break;
    }

    setDateRange(next);
  }, [datePreset]);

  // Initialize from URL param
  useEffect(() => {
    if (filterParam && filterParam !== datePreset) {
      setDatePreset(filterParam);
    }
  }, [filterParam]);

  // Handle preset change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ filter: preset });
    }
    setCurrentPage(1);
    if (preset !== 'custom') {
      setIsDatePickerOpen(false);
    }
  };

  // Get label for preset
  const getPresetLabel = (preset: DatePreset): string => {
    switch (preset) {
      case 'all': return 'All Time';
      case 'today': return "Today's Signups";
      case 'last7days': return 'Last 7 Days';
      case 'last30days': return 'Last 30 Days';
      case 'thisMonth': return 'This Month';
      case 'lastMonth': return 'Last Month';
      case 'custom': return 'Custom Range';
      default: return 'All Time';
    }
  };

  // Handle custom date range selection
  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
      if (range.from && range.to) {
        setDatePreset('custom');
        setSearchParams({ filter: 'custom' });
        setCurrentPage(1);
      }
    }
  };

  // Clear date filter
  const clearDateFilter = () => {
    setDatePreset('all');
    setDateRange({ from: undefined, to: undefined });
    setSearchParams({});
    setCurrentPage(1);
  };


  const extractFunctionError = (err: any): { status?: number; message: string } => {
    const status = err?.context?.status ?? err?.status;

    const tryParse = (value: unknown) => {
      if (typeof value !== "string") return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    // supabase-js FunctionsHttpError often nests response info under `context`
    const ctxBody = err?.context?.body;
    const parsedCtx = tryParse(ctxBody);

    let message = String(err?.message ?? "");

    // Some errors embed a JSON blob at the end of the message:
    // "Edge function returned 403: Error, {\"error\":\"...\"}"
    const embeddedJsonMatch = message.match(/(\{[\s\S]*\})\s*$/);
    const parsedEmbedded = embeddedJsonMatch ? tryParse(embeddedJsonMatch[1]) : null;

    const apiMessage =
      parsedCtx?.error ??
      parsedEmbedded?.error ??
      undefined;

    if (apiMessage) message = String(apiMessage);

    return { status, message };
  };

  const handleAdminOrAuthError = (
    err: any,
    intent: "view the user list" | "delete users"
  ): boolean => {
    const { status, message } = extractFunctionError(err);

    const isAdminError = status === 403 || /Admin access required/i.test(message);
    if (isAdminError) {
      toast({
        title: "Admin access required",
        description: `Please log in with an admin account to ${intent}.`,
        variant: "destructive",
      });
      navigate("/login");
      return true;
    }

    const isAuthError =
      status === 401 ||
      /Unauthorized/i.test(message) ||
      /missing sub claim/i.test(message) ||
      /No authorization header/i.test(message) ||
      /User not authenticated/i.test(message) ||
      /Authentication error/i.test(message);

    if (isAuthError) {
      toast({
        title: "Session expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      navigate("/login");
      return true;
    }

    return false;
  };

  // Fetch users from database via admin edge function
  useEffect(() => {
    const currentRequestId = ++fetchRequestId.current;
    
    const fetchUsers = async () => {
      setIsLoading(true);

      try {
        // Calculate date range inline to avoid dependency issues
        let activeDateRange: DateRange = { from: undefined, to: undefined };
        switch (datePreset) {
          case 'today':
            activeDateRange = { from: new Date(new Date().setHours(0, 0, 0, 0)), to: new Date() };
            break;
          case 'last7days':
            activeDateRange = { from: subDays(new Date(), 7), to: new Date() };
            break;
          case 'last30days':
            activeDateRange = { from: subDays(new Date(), 30), to: new Date() };
            break;
          case 'thisMonth':
            activeDateRange = { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
            break;
          case 'lastMonth':
            const lastMonth = subMonths(new Date(), 1);
            activeDateRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
            break;
          case 'custom':
            activeDateRange = dateRange;
            break;
        }
        
        const { data, error } = await supabase.functions.invoke("admin-get-users", {
          body: {
            searchQuery,
            page: currentPage,
            limit: itemsPerPage,
            sortColumn:
              sortColumn === "firstName"
                ? "first_name"
                : sortColumn === "lastName"
                  ? "last_name"
                  : sortColumn === "country"
                    ? "country"
                    : "created_at",
            sortDirection,
            filterToday: datePreset === 'today',
            dateFrom: activeDateRange.from?.toISOString(),
            dateTo: activeDateRange.to?.toISOString(),
          },
        });

        // Ignore stale responses
        if (currentRequestId !== fetchRequestId.current) return;

        if (error) {
          if (handleAdminOrAuthError(error, "view the user list")) return;
          throw error;
        }

        setUsers(data?.users || []);
        setTotalCount(data?.totalCount || 0);
      } catch (error: any) {
        // Ignore aborted requests
        if (error?.name === 'AbortError' || error?.context?.name === 'AbortError') return;
        if (currentRequestId !== fetchRequestId.current) return;
        
        if (handleAdminOrAuthError(error, "view the user list")) return;

        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (currentRequestId === fetchRequestId.current) {
          setIsLoading(false);
        }
      }
    };

    fetchUsers();
  }, [
    searchQuery,
    currentPage,
    itemsPerPage,
    sortColumn,
    sortDirection,
    datePreset,
    customRangeKey,
    refreshTrigger,
  ]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // SweetAlert2 View User Modal
  const handleViewUser = (user: User) => {
    Swal.fire({
      title: `<strong class="text-blue-600">User Details</strong>`,
      html: `
        <div class="text-left space-y-3 p-2">
          <div class="flex items-center gap-3 mb-4">
            <img src="${user.avatar}" class="w-16 h-16 rounded-full border-2 border-blue-200" alt="Avatar" />
            <div>
              <h3 class="font-bold text-lg text-slate-800">${user.firstName} ${user.lastName}</h3>
              <span class="text-sm px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">${user.status}</span>
            </div>
          </div>
          <div class="border-t pt-3 space-y-2">
            <p class="flex items-center gap-2"><span class="font-medium text-slate-600 w-20">Email:</span> <span class="text-slate-800">${user.email}</span></p>
            <p class="flex items-center gap-2"><span class="font-medium text-slate-600 w-20">Phone:</span> <span class="text-slate-800">${user.phone}</span></p>
            <p class="flex items-center gap-2"><span class="font-medium text-slate-600 w-20">Birthday:</span> <span class="text-slate-800">${user.birthday}</span></p>
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      width: 420,
      customClass: {
        popup: 'rounded-xl',
      }
    });
  };

  // SweetAlert2 Edit User Modal
  const handleEditUser = (user: User) => {
    Swal.fire({
      title: '<span class="text-amber-600">Edit User</span>',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input id="swal-firstName" class="swal2-input w-full !m-0" value="${user.firstName}" placeholder="First Name">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input id="swal-lastName" class="swal2-input w-full !m-0" value="${user.lastName}" placeholder="Last Name">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input id="swal-email" type="email" class="swal2-input w-full !m-0" value="${user.email}" placeholder="Email">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input id="swal-phone" class="swal2-input w-full !m-0" value="${user.phone}" placeholder="Phone">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      width: 420,
      customClass: {
        popup: 'rounded-xl',
      },
      preConfirm: () => {
        return {
          firstName: (document.getElementById('swal-firstName') as HTMLInputElement).value,
          lastName: (document.getElementById('swal-lastName') as HTMLInputElement).value,
          email: (document.getElementById('swal-email') as HTMLInputElement).value,
          phone: (document.getElementById('swal-phone') as HTMLInputElement).value,
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: `User ${result.value.firstName} ${result.value.lastName} has been updated.`,
          confirmButtonColor: '#22c55e',
          timer: 2000,
          timerProgressBar: true
        });
      }
    });
  };

  // Toggle select all users on current page
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.user_id)));
    }
  };

  // Toggle single user selection
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };


  // Actual delete function that calls the edge function
  const performDelete = async (userIds: string[]) => {
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userIds },
      });

      if (error) {
        if (handleAdminOrAuthError(error, "delete users")) return;
        throw error;
      }

      toast({
        title: "Success",
        description: data?.message,
      });

      // Clear selection and refresh list
      setSelectedUsers(new Set());
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      if (handleAdminOrAuthError(error, "delete users")) return;

      console.error("Error deleting users:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete users",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  // SweetAlert2 Delete User Modal (single user) - with admin protection
  const handleDeleteUser = async (user: User) => {
    // Check if user is an admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user_id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!roleData;

    if (isAdmin) {
      // Admin user - require email confirmation
      const { value: enteredEmail } = await Swal.fire({
        title: '<span class="text-red-600">⚠️ Deleting Admin User</span>',
        html: `
          <div class="text-center">
            <img src="${user.avatar}" class="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-red-100" alt="Avatar" />
            <p class="text-slate-700 mb-2">You are about to delete an <strong class="text-red-600">ADMIN</strong> user:</p>
            <p class="font-bold text-slate-900">${user.firstName} ${user.lastName}</p>
            <p class="text-sm text-red-500 mt-2 mb-4">This action cannot be undone.</p>
            <p class="text-sm text-slate-600">Please type the admin's email address to confirm:</p>
            <p class="text-xs text-slate-400 mt-1">${user.email}</p>
          </div>
        `,
        input: 'email',
        inputPlaceholder: 'Enter admin email to confirm',
        inputAttributes: {
          autocapitalize: 'off',
          autocomplete: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Delete Admin',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        width: 420,
        customClass: {
          popup: 'rounded-xl',
        },
        inputValidator: (value) => {
          if (!value) {
            return 'Please enter the email address';
          }
          return null;
        }
      });

      if (enteredEmail) {
        if (enteredEmail.toLowerCase() === user.email.toLowerCase()) {
          performDelete([user.user_id]);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Email Mismatch',
            text: 'The email address you entered does not match. Deletion denied.',
            confirmButtonColor: '#ef4444',
          });
        }
      }
    } else {
      // Regular user - normal deletion flow
      Swal.fire({
        title: '<span class="text-red-600">Delete User?</span>',
        html: `
          <div class="text-center">
            <img src="${user.avatar}" class="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-red-100" alt="Avatar" />
            <p class="text-slate-700">Are you sure you want to delete</p>
            <p class="font-bold text-slate-900">${user.firstName} ${user.lastName}?</p>
            <p class="text-sm text-red-500 mt-2">This action cannot be undone.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        width: 380,
        customClass: {
          popup: 'rounded-xl',
        }
      }).then((result) => {
        if (result.isConfirmed) {
          performDelete([user.user_id]);
        }
      });
    }
  };

  // SweetAlert2 Batch Delete Modal - with admin protection
  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) return;

    const selectedUsersList = users.filter(u => selectedUsers.has(u.user_id));
    
    // Check if any selected users are admins
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("user_id", Array.from(selectedUsers))
      .eq("role", "admin");

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);
    const adminUsers = selectedUsersList.filter(u => adminUserIds.has(u.user_id));
    const regularUsers = selectedUsersList.filter(u => !adminUserIds.has(u.user_id));

    if (adminUsers.length > 0) {
      // Some selected users are admins - require email confirmation for each
      const adminEmails = adminUsers.map(u => u.email);
      const adminNames = adminUsers.map(u => `${u.firstName} ${u.lastName} (${u.email})`).join('<br/>');

      const { value: enteredEmails } = await Swal.fire({
        title: '<span class="text-red-600">⚠️ Admin Users Selected</span>',
        html: `
          <div class="text-center">
            <p class="text-slate-700 mb-2">You are deleting <strong class="text-red-600">${adminUsers.length} admin user(s)</strong>:</p>
            <div class="text-sm text-slate-600 max-h-24 overflow-y-auto mb-3">${adminNames}</div>
            <p class="text-sm text-red-500 mb-4">This action cannot be undone.</p>
            <p class="text-sm text-slate-600">Enter all admin emails (comma-separated) to confirm:</p>
          </div>
        `,
        input: 'textarea',
        inputPlaceholder: 'Enter admin emails separated by commas',
        inputAttributes: {
          autocapitalize: 'off',
          autocomplete: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Delete All Selected',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        width: 480,
        customClass: {
          popup: 'rounded-xl',
        },
        inputValidator: (value) => {
          if (!value) {
            return 'Please enter the admin email addresses';
          }
          return null;
        }
      });

      if (enteredEmails) {
        const enteredEmailList = enteredEmails.split(',').map((e: string) => e.trim().toLowerCase());
        const allAdminEmailsMatch = adminEmails.every(email => 
          enteredEmailList.includes(email.toLowerCase())
        );

        if (allAdminEmailsMatch) {
          performDelete(Array.from(selectedUsers));
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Email Mismatch',
            text: 'Not all admin email addresses match. Deletion denied.',
            confirmButtonColor: '#ef4444',
          });
        }
      }
    } else {
      // No admin users - regular batch delete
      const names = selectedUsersList.map(u => `${u.firstName} ${u.lastName}`).join(', ');

      Swal.fire({
        title: '<span class="text-red-600">Delete Selected Users?</span>',
        html: `
          <div class="text-center">
            <p class="text-slate-700 mb-2">You are about to delete <strong>${selectedUsers.size}</strong> user(s):</p>
            <p class="text-sm text-slate-600 max-h-24 overflow-y-auto">${names}</p>
            <p class="text-sm text-red-500 mt-3">This action cannot be undone.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: `Delete ${selectedUsers.size} User(s)`,
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        width: 420,
        customClass: {
          popup: 'rounded-xl',
        }
      }).then((result) => {
        if (result.isConfirmed) {
          performDelete(Array.from(selectedUsers));
        }
      });
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <AdminLayout title="User Management">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {datePreset !== 'all' ? getPresetLabel(datePreset) : "User List"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {datePreset !== 'all'
                    ? `${totalCount} members in selected period` 
                    : "Manage and view all registered users"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedUsers.size > 0 && (
                  <Button 
                    variant="destructive" 
                    className="gap-2"
                    onClick={handleBatchDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete {selectedUsers.size} Selected
                  </Button>
                )}
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import
                </Button>
                <Button className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  Add User
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-card rounded-xl border border-border shadow-sm">
            {/* Cover Tools Header */}
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
              {/* Date Range Filter */}
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-[200px] justify-start">
                    <Calendar className="w-4 h-4" />
                    {datePreset === 'all' ? (
                      <span>All Time</span>
                    ) : datePreset === 'custom' && dateRange.from && dateRange.to ? (
                      <span>{format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}</span>
                    ) : (
                      <span>{getPresetLabel(datePreset)}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <div className="flex">
                    {/* Presets */}
                    <div className="border-r border-slate-200 p-2 space-y-1 min-w-[140px]">
                      {(['all', 'today', 'last7days', 'last30days', 'thisMonth', 'lastMonth'] as DatePreset[]).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handlePresetChange(preset)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                            datePreset === preset
                              ? "bg-blue-100 text-blue-700 font-medium"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {getPresetLabel(preset)}
                        </button>
                      ))}
                    </div>
                    {/* Calendar */}
                    <div className="p-3">
                      <CalendarComponent
                        mode="range"
                        selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                        onSelect={(range) => handleCustomDateChange(range as DateRange)}
                        numberOfMonths={2}
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear filter button */}
              {datePreset !== 'all' && (
                <Button variant="ghost" size="sm" onClick={clearDateFilter} className="gap-1 text-slate-500">
                  <X className="w-3 h-3" />
                  Clear
                </Button>
              )}

              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search users by name, email, or phone..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>entries</span>
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 cursor-pointer"
                    checked={users.length > 0 && selectedUsers.size === users.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('firstName')}
                >
                  <div className="flex items-center gap-2">
                    First Name
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('lastName')}
                >
                  <div className="flex items-center gap-2">
                    Last Name
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead>Username</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('birthday')}
                >
                  <div className="flex items-center gap-2">
                    Birthday
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('country')}
                >
                  <div className="flex items-center gap-2">
                    Country
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-slate-500">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className={cn("hover:bg-slate-50", selectedUsers.has(user.user_id) && "bg-blue-50")}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 cursor-pointer"
                        checked={selectedUsers.has(user.user_id)}
                        onChange={() => toggleUserSelection(user.user_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}</AvatarFallback>
                          </Avatar>
                          {user.isAdmin && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5" title="Admin">
                              <Shield className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{user.firstName}</span>
                          {user.isAdmin && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs px-1.5 py-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">{user.lastName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AtSign className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{user.username || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{user.birthday}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFlagUrl(user.country) ? (
                          <img 
                            src={getFlagUrl(user.country)!} 
                            alt={`${user.country} flag`}
                            className="w-6 h-4 object-cover rounded-sm shadow-sm"
                          />
                        ) : (
                          <span className="w-6 h-4 bg-slate-200 rounded-sm flex items-center justify-center text-xs text-slate-500">🌍</span>
                        )}
                        <span className="text-slate-600">{user.country}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-500 hover:bg-green-50 hover:text-green-600"
                          onClick={() => user.username ? navigate(`/${user.username}`) : null}
                          disabled={!user.username}
                          title="View Member Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleViewUser(user)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                          onClick={() => handleEditUser(user)}
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDeleteUser(user)}
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => user.username ? navigate(`/${user.username}`) : null}
                              disabled={!user.username}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>Send Email</DropdownMenuItem>
                            <DropdownMenuItem>Reset Password</DropdownMenuItem>
                            <DropdownMenuItem>View Activity</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Suspend User</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
              <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{" "}
              <span className="font-medium text-slate-700">{totalCount}</span> users
            </div>
            
            <div className="flex items-center gap-2">
              {/* First Page */}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              
              {/* Previous Page */}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-2 text-slate-400">...</span>
                    ) : (
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        className={cn(
                          "h-9 w-9",
                          currentPage === page && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        )}
                        onClick={() => goToPage(page as number)}
                      >
                        {page}
                      </Button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Next Page */}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              {/* Last Page */}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>

              {/* Jump to Page */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-slate-500">Go to</span>
                <Input 
                  type="number"
                  min={1}
                  max={totalPages}
                  className="w-16 h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      goToPage(parseInt((e.target as HTMLInputElement).value) || 1);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserList;
