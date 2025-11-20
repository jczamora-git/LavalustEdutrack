import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Calendar, Plus, Edit, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/Confirm";

interface AcademicPeriod {
  id: number;
  school_year: string;
  semester: string;
  period_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const AcademicPeriods = () => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AcademicPeriod | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    school_year: "",
    semester: "1st Semester",
    period_type: "Midterm",
    start_date: "",
    end_date: "",
    status: "upcoming",
  });

  // Fetch all academic periods
  const { data: periodsData, isLoading } = useQuery({
    queryKey: ['academic-periods'],
    queryFn: () => apiGet(API_ENDPOINTS.ACADEMIC_PERIODS),
  });

  const periods = (periodsData?.data || []) as AcademicPeriod[];

  // Fetch active period
  const { data: activeData } = useQuery({
    queryKey: ['academic-period', 'active'],
    queryFn: () => apiGet(API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE),
  });

  const activePeriod = activeData?.data;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost(API_ENDPOINTS.ACADEMIC_PERIODS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Academic period created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create academic period",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiPut(API_ENDPOINTS.ACADEMIC_PERIOD_BY_ID(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
      queryClient.invalidateQueries({ queryKey: ['academic-period', 'active'] });
      setIsEditDialogOpen(false);
      setEditingPeriod(null);
      resetForm();
      toast({
        title: "Success",
        description: "Academic period updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update academic period",
        variant: "destructive",
      });
    },
  });

  // Set active mutation
  const setActiveMutation = useMutation({
    mutationFn: (id: number) => apiPost(API_ENDPOINTS.ACADEMIC_PERIOD_SET_ACTIVE(id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
      queryClient.invalidateQueries({ queryKey: ['academic-period', 'active'] });
      toast({
        title: "Success",
        description: "Academic period set as active",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set period as active",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(API_ENDPOINTS.ACADEMIC_PERIOD_BY_ID(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
      toast({
        title: "Success",
        description: "Academic period deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete academic period",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      school_year: "",
      semester: "1st Semester",
      period_type: "Midterm",
      start_date: "",
      end_date: "",
      status: "upcoming",
    });
  };

  const handleCreate = () => {
    if (!formData.school_year || !formData.start_date || !formData.end_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (period: AcademicPeriod) => {
    setEditingPeriod(period);
    setFormData({
      school_year: period.school_year,
      semester: period.semester,
      period_type: period.period_type,
      start_date: period.start_date,
      end_date: period.end_date,
      status: period.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingPeriod) return;
    if (!formData.school_year || !formData.start_date || !formData.end_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: editingPeriod.id, data: formData });
  };

  const handleSetActive = async (period: AcademicPeriod) => {
    const confirmed = await confirm({
      title: "Set as Active Period?",
      message: `This will set "${period.school_year} ${period.semester} - ${period.period_type}" as the active academic period. All other periods will be deactivated. Continue?`,
    });

    if (confirmed) {
      setActiveMutation.mutate(period.id);
    }
  };

  const handleDelete = async (period: AcademicPeriod) => {
    if (period.status === 'active') {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete active period. Set another period as active first.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Delete Academic Period?",
      message: `Are you sure you want to delete "${period.school_year} ${period.semester} - ${period.period_type}"? This action cannot be undone.`,
    });

    if (confirmed) {
      deleteMutation.mutate(period.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'upcoming':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Upcoming</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const groupedPeriods = periods.reduce((acc, period) => {
    if (!acc[period.school_year]) {
      acc[period.school_year] = [];
    }
    acc[period.school_year].push(period);
    return acc;
  }, {} as Record<string, AcademicPeriod[]>);

  const sortedYears = Object.keys(groupedPeriods).sort((a, b) => b.localeCompare(a));

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Academic Periods</h1>
            <p className="text-muted-foreground">Manage school years, semesters, and grading periods</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Period
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Academic Period</DialogTitle>
                <DialogDescription>Add a new school year, semester, and grading period</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="school_year">School Year *</Label>
                  <Input
                    id="school_year"
                    placeholder="e.g., 2025-2026"
                    value={formData.school_year}
                    onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester *</Label>
                  <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Semester">1st Semester</SelectItem>
                      <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_type">Period Type *</Label>
                  <Select value={formData.period_type} onValueChange={(v) => setFormData({ ...formData, period_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Midterm">Midterm</SelectItem>
                      <SelectItem value="Final Term">Final Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Period"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Period Card */}
        {activePeriod && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle>Currently Active Period</CardTitle>
                  <CardDescription>This is the active grading period system-wide</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">School Year</p>
                  <p className="text-lg font-bold text-primary">{activePeriod.school_year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Semester</p>
                  <p className="text-lg font-bold">{activePeriod.semester}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Period Type</p>
                  <Badge className="text-sm px-3 py-1">{activePeriod.period_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-medium">
                    {new Date(activePeriod.start_date).toLocaleDateString()} - {new Date(activePeriod.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Periods List by School Year */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading academic periods...</p>
            </CardContent>
          </Card>
        ) : periods.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Academic Periods</h3>
              <p className="text-muted-foreground mb-4">Create your first academic period to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Period
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedYears.map((year) => (
              <Card key={year}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    School Year {year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedPeriods[year]
                      .sort((a, b) => {
                        // Sort by semester order and period type
                        const semesterOrder: any = { '1st Semester': 1, '2nd Semester': 2, 'Summer': 3 };
                        const periodOrder: any = { 'Midterm': 1, 'Final Term': 2 };
                        const semesterDiff = semesterOrder[a.semester] - semesterOrder[b.semester];
                        return semesterDiff !== 0 ? semesterDiff : periodOrder[a.period_type] - periodOrder[b.period_type];
                      })
                      .map((period) => (
                        <div
                          key={period.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{period.semester} - {period.period_type}</h4>
                              {getStatusBadge(period.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {period.status !== 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetActive(period)}
                                disabled={setActiveMutation.isPending}
                                className="whitespace-nowrap"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {setActiveMutation.isPending ? 'Activating...' : 'Set Active'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(period)}
                              disabled={updateMutation.isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(period)}
                              disabled={period.status === 'active' || deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Academic Period</DialogTitle>
              <DialogDescription>Update academic period details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_school_year">School Year *</Label>
                <Input
                  id="edit_school_year"
                  placeholder="e.g., 2025-2026"
                  value={formData.school_year}
                  onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_semester">Semester *</Label>
                <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Semester">1st Semester</SelectItem>
                    <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_period_type">Period Type *</Label>
                <Select value={formData.period_type} onValueChange={(v) => setFormData({ ...formData, period_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Midterm">Midterm</SelectItem>
                    <SelectItem value="Final Term">Final Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Start Date *</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_end_date">End Date *</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Period"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AcademicPeriods;
