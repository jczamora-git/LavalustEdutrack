import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Users, Grid3x3, List, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertMessage } from "@/components/AlertMessage";
import EmailLoadingModal from "@/components/EmailLoadingModal";
import { useConfirm } from "@/components/Confirm";
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Pagination } from "@/components/Pagination";
import { toast } from "sonner";

const UserManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRoleCheck();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isLoading, setIsLoading] = useState(false);

  type User = { 
    id: string; 
    first_name: string; 
    last_name: string; 
    email: string; 
    role: "admin" | "teacher" | "student"; 
    status: string;
    phone?: string;
  };

  const [users, setUsers] = useState<User[]>([]);

  // Dialog/form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSelectRoleOpen, setIsSelectRoleOpen] = useState(false);
  const [openedFromSelector, setOpenedFromSelector] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState<{ 
    firstName: string; 
    lastName: string; 
    email: string; 
    role: "admin" | "teacher" | "student"; 
    status: string;
    phone?: string;
    yearLevel?: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    role: "student",
    status: "active",
    phone: "",
    yearLevel: "1st Year",
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  const confirm = useConfirm();

  useEffect(() => {
    if (!roleLoading) {
      if (!isAuthenticated || !isAdmin) {
        navigate("/auth");
      } else {
        fetchUsers();
      }
    }
  }, [isAuthenticated, isAdmin, navigate, roleLoading]);

  // Fetch users from API
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      
      const url = `${API_ENDPOINTS.USERS}?${params.toString()}`;
      console.log('Fetching users from:', url);
      console.log('Current user from context:', user);
      
      const response = await apiGet(url);
      console.log('API Response:', response);
      
      if (response.success) {
        setUsers(response.users);
      }
    } catch (error: any) {
      console.error('Fetch users error:', error);
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    if (isAuthenticated && isAdmin && !roleLoading) {
      fetchUsers();
    }
  }, [roleFilter, searchQuery]);

  // Reset pagination when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchQuery]);

  // clamp currentPage to available pages
  const totalItems = users.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pagedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    // Open the role selection dialog first
    setForm({ firstName: "", lastName: "", email: "", role: "student", status: "active", phone: "", yearLevel: "1st Year" });
    setIsSelectRoleOpen(true);
  };

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error("First name, last name and email are required");
      return;
    }

    setIsLoading(true);
    setEmailSuccess(false);
    setShowEmailModal(true);
    try {
      // Step 1: Create the user
      const response = await apiPost(API_ENDPOINTS.USERS, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        phone: form.phone?.trim() || "",
        password: "demo123" // Default password
      });

      if (!response.success || !response.user) {
        toast.error("Failed to create user");
        setIsLoading(false);
        setShowEmailModal(false);
        return;
      }

      const userId = response.user.id;
      const defaultPassword = response.default_password || 'demo123';
      console.log("User created with ID:", userId, "Role:", form.role);

      // Step 2: Create profile based on role
      if (form.role === 'teacher') {
        await createTeacherProfile(userId);
      } else if (form.role === 'student') {
        await createStudentProfile(userId);
      }

      // Step 3: Send welcome email
      const emailEndpoint = form.role === 'student' 
        ? '/api/students/send-welcome-email'
        : '/api/auth/send-welcome-email';
      
      const emailResponse = await fetch(emailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          password: defaultPassword,
          role: form.role
        }),
        credentials: 'include'
      });

      // Read as text first in case the server returns HTML (e.g. login page or error page)
      const emailText = await emailResponse.text();
      let emailData: any = null;
      try {
        emailData = emailText ? JSON.parse(emailText) : { success: emailResponse.ok };
      } catch (err) {
        console.error('Non-JSON response from email endpoint:', emailResponse.status, emailText);
        emailData = { success: emailResponse.ok, message: emailText };
      }

      if (emailData && emailData.success) {
        setEmailSuccess(true);
        toast.success(`${form.role === 'teacher' ? 'Teacher' : form.role === 'student' ? 'Student' : 'Admin'} created! Welcome email sent.`);

        // Auto close modal and refresh after 3 seconds
        setTimeout(() => {
          setShowEmailModal(false);
          setIsCreateOpen(false);
          setForm({ firstName: "", lastName: "", email: "", role: "student", status: "active", phone: "", yearLevel: "1st Year" });
          fetchUsers();
        }, 3000);
      } else {
        setEmailSuccess(false);
        toast.warning(`${form.role === 'teacher' ? 'Teacher' : form.role === 'student' ? 'Student' : 'Admin'} created but welcome email failed to send.`);
        // optionally log server's raw response to help debugging
        if (emailData && emailData.message) console.debug('Email endpoint message:', emailData.message);
        setShowEmailModal(false);
        setIsCreateOpen(false);
        setForm({ firstName: "", lastName: "", email: "", role: "student", status: "active", phone: "", yearLevel: "1st Year" });
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Create error:", error);
      setEmailSuccess(false);
      setShowEmailModal(false);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: "admin" | "teacher" | "student") => {
    // set role and open the create modal
    setForm((f) => ({ ...f, role, yearLevel: role === 'student' ? (f.yearLevel || '1st Year') : undefined }));
    setIsSelectRoleOpen(false);
    setOpenedFromSelector(true);
    setIsCreateOpen(true);
  };

  // clear openedFromSelector when create modal closes
  useEffect(() => {
    if (!isCreateOpen) setOpenedFromSelector(false);
  }, [isCreateOpen]);

  // Create teacher profile
  const createTeacherProfile = async (userId: number) => {
    try {
      // Get the next employee ID
      const employeeId = await generateEmployeeId();
      console.log("Generated employee ID:", employeeId);

      // Insert into teachers table
      const query = `INSERT INTO \`teachers\` (\`user_id\`, \`employee_id\`) VALUES (${userId}, '${employeeId}')`;
      console.log("Executing query:", query);

      // Since we don't have a direct query endpoint, we'll use a custom API call
      const response = await fetch(`${API_ENDPOINTS.USERS}/../teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          employee_id: employeeId
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn("Teacher profile creation failed, but user was created");
      }
    } catch (error) {
      console.warn("Could not create teacher profile:", error);
      // Don't fail if profile creation fails - user is already created
    }
  };

  // Create student profile
  const createStudentProfile = async (userId: number) => {
    try {
      // Get the next student ID
      const studentId = await generateStudentId();
      console.log("Generated student ID:", studentId);

      // Insert into students table
      const yearLevel = form.yearLevel || '1st Year';
      const query = `INSERT INTO \`students\` (\`user_id\`, \`student_id\`, \`year_level\`, \`status\`) VALUES (${userId}, '${studentId}', '${yearLevel}', 'active')`;
      console.log("Executing query:", query);

      // Since we don't have a direct query endpoint, we'll use a custom API call
      const response = await fetch(`${API_ENDPOINTS.USERS}/../students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          student_id: studentId,
          year_level: yearLevel,
          status: 'active'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn("Student profile creation failed, but user was created");
      }
    } catch (error) {
      console.warn("Could not create student profile:", error);
      // Don't fail if profile creation fails - user is already created
    }
  };

  // Generate next employee ID
  const generateEmployeeId = async (): Promise<string> => {
    try {
      const year = new Date().getFullYear();
      const pattern = `EMP${year}-%`;
      
      // Fetch last employee ID from backend
      const response = await fetch(`${API_ENDPOINTS.USERS}/../teachers/last-id?year=${year}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.last_id) {
          const match = data.last_id.match(/EMP\d+-(\d+)/);
          if (match) {
            const nextNum = parseInt(match[1]) + 1;
            return `EMP${year}-${String(nextNum).padStart(3, '0')}`;
          }
        }
      }
      
      // Fallback to 001
      return `EMP${year}-001`;
    } catch (error) {
      console.error("Error generating employee ID:", error);
      const year = new Date().getFullYear();
      return `EMP${year}-001`;
    }
  };

  // Generate next student ID
  const generateStudentId = async (): Promise<string> => {
    try {
      const year = new Date().getFullYear();
      
      // Fetch last student ID from backend
      const response = await fetch(`${API_ENDPOINTS.USERS}/../students/last-id?year=${year}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.last_id) {
          const match = data.last_id.match(/MCC\d+-(\d+)/);
          if (match) {
            const nextNum = parseInt(match[1]) + 1;
            return `MCC${year}-${String(nextNum).padStart(5, '0')}`;
          }
        }
      }
      
      // Fallback to 00001
      return `MCC${year}-00001`;
    } catch (error) {
      console.error("Error generating student ID:", error);
      const year = new Date().getFullYear();
      return `MCC${year}-00001`;
    }
  };

  const handleOpenEdit = (u: User) => {
    setSelectedUserId(u.id);
    setForm({ 
      firstName: u.first_name, 
      lastName: u.last_name, 
      email: u.email, 
      role: u.role, 
      status: u.status,
      phone: u.phone || ""
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedUserId) return;

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error("First name, last name and email are required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiPut(API_ENDPOINTS.USER_BY_ID(selectedUserId), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
        phone: form.phone?.trim() || ""
      });

      if (response.success) {
        toast.success("User updated successfully");
        setIsEditOpen(false);
        setSelectedUserId(null);
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    
    const ok = await confirm({
      title: 'Inactivate user',
      description: `Inactivate user ${u.first_name} ${u.last_name}? This will set the user to INACTIVE status.`,
      emphasis: `${u.first_name} ${u.last_name}`,
      confirmText: 'Inactivate',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!ok) return;

    setIsLoading(true);
    try {
      const response = await apiDelete(API_ENDPOINTS.USER_BY_ID(id));
      
      if (response.success) {
        toast.success(`User ${u.first_name} ${u.last_name} has been set to inactive`);
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      {/* Email Loading Modal */}
      <EmailLoadingModal
        isOpen={showEmailModal}
        isSuccess={emailSuccess}
        emailType="confirmation"
        customMessage="Sending welcome email..."
        customSuccessMessage="Welcome email sent successfully!"
        onComplete={() => setShowEmailModal(false)}
        autoCloseDuration={3000}
      />

      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-muted-foreground text-lg">Create and manage user accounts across all roles</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-5 w-5 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  All Users ({isLoading ? <Loader2 className="inline h-5 w-5 animate-spin" /> : users.length})
                </CardTitle>
                <CardDescription className="text-base">Manage all system users and their roles</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 py-2 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
                <div className="w-40">
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
                    <SelectTrigger className="border-2 focus:border-accent-500 rounded-lg px-3 py-2 bg-background">
                      <SelectValue>{roleFilter === "all" ? "All Roles" : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border-2 shadow-sm hover:bg-accent-50 hover:border-accent-300 transition-all"
                  title="Toggle view"
                  aria-pressed={viewMode === "grid"}
                >
                  {viewMode === "list" ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  {viewMode === "list" ? "Grid" : "List"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-4 text-lg text-muted-foreground">Loading users...</span>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden ${
                      user.status === "inactive"
                        ? "bg-muted/50 border-muted opacity-70"
                        : "bg-gradient-to-br from-card to-muted/30 border-accent-200 hover:border-accent-400 hover:shadow-xl"
                    }`}
                  >
                    <div className={user.status === "inactive" ? "p-5 opacity-60 pointer-events-none" : "p-5"}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                            <span className="font-bold text-lg text-white">
                              {(user.first_name[0] + user.last_name[0]).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-lg">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge 
                          variant="secondary" 
                          className="capitalize font-semibold px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20"
                        >
                          {user.role}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="bg-success/10 text-success border-success/20 font-semibold px-3 py-1"
                        >
                          {user.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-auto p-5 border-t border-accent-100 bg-muted/30">
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                          className="flex-1 gap-2 font-medium hover:bg-accent-50 hover:border-accent-300 transition-all"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.status === "inactive"}
                          className={`text-destructive hover:text-destructive hover:bg-destructive/10 flex-1 gap-2 font-medium transition-all ${
                            user.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {pagedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-5 border-2 rounded-2xl transition-all duration-300 ${
                      user.status === "inactive"
                        ? "bg-muted/50 border-muted opacity-70"
                        : "bg-card border-accent-100 hover:bg-accent-50/50 hover:border-accent-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                        <span className="font-bold text-lg text-white">
                          {(user.first_name[0] + user.last_name[0]).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-base">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary" 
                        className="capitalize font-semibold px-3 py-1.5 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20"
                      >
                        {user.role}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="bg-success/10 text-success border-success/20 font-semibold px-3 py-1.5"
                      >
                        {user.status}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenEdit(user)}
                        className="hover:bg-accent-50 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(user.id)}
                        disabled={user.status === "inactive"}
                        className={`transition-colors ${user.status === "inactive" ? "opacity-50 cursor-not-allowed" : "hover:bg-destructive/10"}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && users.length === 0 && (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground font-medium">No users found matching your filters</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
              </div>
            )}
            {/* Pagination controls for users */}
            {!isLoading && totalItems > 0 && (
              <div className="mt-6 px-2">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role selection dialog (first step) */}
        <Dialog open={isSelectRoleOpen} onOpenChange={setIsSelectRoleOpen}>
          <DialogContent className="max-w-2xl border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-4 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Which user would you like to create?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-6 pb-6">
              <p className="text-sm text-muted-foreground">Choose the account type to create. For students you'll be able to select a year level in the next step.</p>
              <div className="flex gap-3">
                <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white" onClick={() => handleSelectRole('admin')}>Admin</Button>
                <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white" onClick={() => handleSelectRole('teacher')}>Teacher</Button>
                <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white" onClick={() => handleSelectRole('student')}>Student</Button>
              </div>
              <div className="text-right mt-3">
                <Button variant="outline" onClick={() => setIsSelectRoleOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create dialog (controlled) */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="font-semibold text-lg">First Name *</Label>
                  <Input 
                    id="firstName" 
                    value={form.firstName} 
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} 
                    placeholder="Enter first name" 
                    className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="font-semibold text-lg">Last Name *</Label>
                  <Input 
                    id="lastName" 
                    value={form.lastName} 
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} 
                    placeholder="Enter last name" 
                    className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="font-semibold text-lg">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} 
                  placeholder="Enter email address" 
                  className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="font-semibold text-lg">Phone (Optional)</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={form.phone} 
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} 
                  placeholder="Enter phone number" 
                  className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                />
              </div>
              {!openedFromSelector && (
                <div>
                  <Label htmlFor="role" className="font-semibold text-lg">Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as any }))}>
                    <SelectTrigger className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg bg-background">
                      <SelectValue>{form.role.charAt(0).toUpperCase() + form.role.slice(1)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {openedFromSelector && (
                <div>
                  <Label className="font-semibold text-lg">Role</Label>
                  <div className="mt-2">
                    <Badge variant="secondary" className="capitalize font-semibold px-3 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20">{form.role}</Badge>
                  </div>
                </div>
              )}

              {form.role === 'student' && (
                <div>
                  <Label htmlFor="yearLevel" className="font-semibold text-lg">Year Level *</Label>
                  <Select value={form.yearLevel} onValueChange={(v) => setForm((f) => ({ ...f, yearLevel: v }))}>
                    <SelectTrigger className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg bg-background">
                      <SelectValue>{form.yearLevel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Year">1st Year</SelectItem>
                      <SelectItem value="2nd Year">2nd Year</SelectItem>
                      <SelectItem value="3rd Year">3rd Year</SelectItem>
                      <SelectItem value="4th Year">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="bg-muted/20 border-2 border-muted rounded-lg p-4 mt-4">
                <p className="text-sm text-muted-foreground font-medium">
                  ✓ New users are created with <span className="font-bold">Active</span> status by default
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-2">
                  ✓ Student profiles auto-generated with ID: <code className="bg-white px-1 text-xs">MCC{'{year}'}-{'{00000}'}</code>
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  ✓ Teacher profiles auto-generated with ID: <code className="bg-white px-1 text-xs">EMP{'{year}'}-{'{000}'}</code>
                </p>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold text-base py-3 rounded-lg shadow-lg hover:shadow-xl transition-all mt-6" 
                onClick={handleCreate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit dialog (controlled) */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName" className="font-semibold text-lg">First Name *</Label>
                  <Input 
                    id="edit-firstName" 
                    value={form.firstName} 
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} 
                    placeholder="Enter first name" 
                    className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName" className="font-semibold text-lg">Last Name *</Label>
                  <Input 
                    id="edit-lastName" 
                    value={form.lastName} 
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} 
                    placeholder="Enter last name" 
                    className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-email" className="font-semibold text-lg">Email *</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} 
                  placeholder="Enter email address" 
                  className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone" className="font-semibold text-lg">Phone (Optional)</Label>
                <Input 
                  id="edit-phone" 
                  type="tel" 
                  value={form.phone} 
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} 
                  placeholder="Enter phone number" 
                  className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="edit-role" className="font-semibold text-lg">Role *</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as any }))}>
                  <SelectTrigger className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg bg-background">
                    <SelectValue>{form.role.charAt(0).toUpperCase() + form.role.slice(1)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status" className="font-semibold text-lg">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-2 py-3 text-base border-2 focus:border-accent-500 rounded-lg bg-background">
                    <SelectValue>{form.status.charAt(0).toUpperCase() + form.status.slice(1)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold text-base py-3 rounded-lg shadow-lg hover:shadow-xl transition-all" 
                  onClick={handleEdit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 font-semibold text-base py-3 border-2 rounded-lg hover:bg-muted/50" 
                  onClick={() => setIsEditOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {alert && (
          <AlertMessage
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
