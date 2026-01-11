import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, Download, Upload, Plus, MoreHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Edit, Trash2, Eye, Mail, Phone, ArrowUpDown, ArrowLeft
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Demo user data
const generateUsers = (count: number) => {
  const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    email: `user${i + 1}@example.com`,
    phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    birthday: new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
    status: Math.random() > 0.3 ? 'active' : 'inactive'
  }));
};

const allUsers = generateUsers(87);

const UserList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => 
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.includes(searchQuery)
  );

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValue = a[sortColumn as keyof typeof a];
    const bValue = b[sortColumn as keyof typeof b];
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = sortedUsers.slice(startIndex, endIndex);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/adminindex')}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">User List</h1>
                <p className="text-sm text-slate-500">Manage and view all registered users</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Cover Tools Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
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
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
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
                  <input type="checkbox" className="rounded border-slate-300" />
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
                <TableHead>Phone</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('birthday')}
                >
                  <div className="flex items-center gap-2">
                    Birthday
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50">
                  <TableCell>
                    <input type="checkbox" className="rounded border-slate-300" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-slate-900">{user.firstName}</span>
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
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{user.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{user.birthday}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50 hover:text-blue-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:text-amber-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Send Email</DropdownMenuItem>
                          <DropdownMenuItem>Reset Password</DropdownMenuItem>
                          <DropdownMenuItem>View Activity</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Suspend User</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{startIndex + 1}</span> to{" "}
              <span className="font-medium text-slate-700">{Math.min(endIndex, sortedUsers.length)}</span> of{" "}
              <span className="font-medium text-slate-700">{sortedUsers.length}</span> users
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
  );
};

export default UserList;
