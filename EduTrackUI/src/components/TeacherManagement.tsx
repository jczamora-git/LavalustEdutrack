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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertMessage } from '@/components/AlertMessage';
import { useTeachers, UpdateTeacherRequest } from '@/hooks/useTeachers';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Users } from 'lucide-react';

export function TeacherManagement() {
  const { user } = useRoleBasedAuth('admin');
  const { teachers, stats, loading, error, getTeachers, updateTeacher, deleteTeacher, getStats } =
    useTeachers();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<UpdateTeacherRequest>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    getTeachers();
    getStats();
  }, []);

  const handleEdit = async () => {
    if (editingId !== null) {
      const result = await updateTeacher(editingId, editData);
      if (result) {
        setEditingId(null);
        setEditData({});
        await getTeachers();
      }
    }
  };

  const handleDelete = async () => {
    if (deleteId !== null) {
      const result = await deleteTeacher(deleteId);
      if (result) {
        setShowDeleteDialog(false);
        setDeleteId(null);
        await getTeachers();
        await getStats();
      }
    }
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Teacher Management</h1>
        <p className="text-gray-600">Manage all teachers and their profiles</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
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
        </div>
      )}

      {/* Search */}
      <div>
        <Input
          placeholder="Search by name, email, or employee ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
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
            <div className="text-center py-8">Loading teachers...</div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No teachers found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        {teacher.first_name} {teacher.last_name}
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.employee_id}</TableCell>
                      <TableCell>{teacher.department || 'N/A'}</TableCell>
                      <TableCell>{teacher.specialization || 'N/A'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            teacher.user_status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {teacher.user_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Edit Dialog */}
                          <Dialog open={editingId === teacher.id} onOpenChange={(open) => {
                            if (!open) setEditingId(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(teacher.id);
                                  setEditData({
                                    department: teacher.department,
                                    specialization: teacher.specialization,
                                  });
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Teacher</DialogTitle>
                                <DialogDescription>
                                  Update teacher profile information
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-department">Department</Label>
                                  <Input
                                    id="edit-department"
                                    value={editData.department || ''}
                                    onChange={(e) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        department: e.target.value,
                                      }))
                                    }
                                    placeholder="Enter department"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-specialization">Specialization</Label>
                                  <Input
                                    id="edit-specialization"
                                    value={editData.specialization || ''}
                                    onChange={(e) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        specialization: e.target.value,
                                      }))
                                    }
                                    placeholder="Enter specialization"
                                  />
                                </div>

                                <Button onClick={handleEdit} className="w-full">
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Delete Button */}
                          <Dialog open={showDeleteDialog && deleteId === teacher.id} onOpenChange={setShowDeleteDialog}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteId(teacher.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Teacher</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete {teacher.first_name} {teacher.last_name}?
                                </DialogDescription>
                              </DialogHeader>

                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowDeleteDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleDelete}
                                >
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
