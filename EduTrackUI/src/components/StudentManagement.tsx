import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertMessage } from '@/components/AlertMessage';
import { useStudents, UpdateStudentRequest } from '@/hooks/useStudents';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2 } from 'lucide-react';

export function StudentManagement() {
  const { user } = useRoleBasedAuth('admin');
  const {
    students,
    stats,
    loading,
    error,
    getStudents,
    updateStudent,
    deleteStudent,
    getStats,
  } = useStudents();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<UpdateStudentRequest>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (filterYear) {
      filters.year_level = filterYear;
    }
    getStudents(filters);
    getStats();
  }, [filterYear]);

  const handleEdit = async () => {
    if (editingId !== null) {
      const result = await updateStudent(editingId, editData);
      if (result) {
        setEditingId(null);
        setEditData({});
        await getStudents();
      }
    }
  };

  const handleDelete = async () => {
    if (deleteId !== null) {
      const result = await deleteStudent(deleteId);
      if (result) {
        setShowDeleteDialog(false);
        setDeleteId(null);
        await getStudents();
        await getStats();
      }
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Student Management</h1>
        <p className="text-gray-600">Manage all students and their profiles</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Year Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                {stats.by_year_level.map((item) => (
                  <div key={item.year_level} className="flex justify-between">
                    <span>{item.year_level}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name, email, or student ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by year level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Year Levels</SelectItem>
            <SelectItem value="1st Year">1st Year</SelectItem>
            <SelectItem value="2nd Year">2nd Year</SelectItem>
            <SelectItem value="3rd Year">3rd Year</SelectItem>
            <SelectItem value="4th Year">4th Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div>
          <AlertMessage message={error} type="error" onClose={() => {}} />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No students found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Year Level</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.year_level}</TableCell>
                      <TableCell>{student.section_id || 'N/A'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            student.user_status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {student.user_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Edit Dialog */}
                          <Dialog
                            open={editingId === student.id}
                            onOpenChange={(open) => {
                              if (!open) setEditingId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(student.id);
                                  setEditData({
                                    yearLevel: student.year_level,
                                    sectionId: student.section_id,
                                    status: student.status,
                                  });
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Student</DialogTitle>
                                <DialogDescription>
                                  Update student profile information
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-yearLevel">Year Level</Label>
                                  <Select
                                    value={editData.yearLevel || ''}
                                    onValueChange={(value) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        yearLevel: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger id="edit-yearLevel">
                                      <SelectValue placeholder="Select year level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1st Year">1st Year</SelectItem>
                                      <SelectItem value="2nd Year">2nd Year</SelectItem>
                                      <SelectItem value="3rd Year">3rd Year</SelectItem>
                                      <SelectItem value="4th Year">4th Year</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor="edit-sectionId">Section ID</Label>
                                  <Input
                                    id="edit-sectionId"
                                    type="number"
                                    value={editData.sectionId || ''}
                                    onChange={(e) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        sectionId: e.target.value ? parseInt(e.target.value) : undefined,
                                      }))
                                    }
                                    placeholder="Enter section ID"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-status">Status</Label>
                                  <Select
                                    value={editData.status || ''}
                                    onValueChange={(value) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        status: value as 'active' | 'inactive',
                                      }))
                                    }
                                  >
                                    <SelectTrigger id="edit-status">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <Button onClick={handleEdit} className="w-full">
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Delete Button */}
                          <Dialog
                            open={showDeleteDialog && deleteId === student.id}
                            onOpenChange={setShowDeleteDialog}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteId(student.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Student</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete {student.first_name}{' '}
                                  {student.last_name}? This will also delete their user account.
                                </DialogDescription>
                              </DialogHeader>

                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowDeleteDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDelete}>
                                  Delete
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
