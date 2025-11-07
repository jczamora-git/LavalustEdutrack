import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateUserForm } from '@/components/CreateUserForm';
import { TeacherManagement } from '@/components/TeacherManagement';
import { StudentManagement } from '@/components/StudentManagement';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';

export default function ManagementPage() {
  const { user } = useRoleBasedAuth('admin');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">System Management</h1>
        <p className="text-gray-600">Manage users, teachers, and students</p>
      </div>

      <Tabs defaultValue="create-user" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create-user">Create User</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="create-user" className="space-y-4">
          <CreateUserForm
            onSuccess={() => {
              setRefreshKey((prev) => prev + 1);
            }}
          />
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <TeacherManagement key={`teachers-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentManagement key={`students-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
