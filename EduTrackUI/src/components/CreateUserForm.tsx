import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertMessage } from '@/components/AlertMessage';
import { useUsers, CreateUserRequest } from '@/hooks/useUsers';

interface CreateUserFormProps {
  onSuccess?: () => void;
}

export function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const { createUser, loading, error } = useUsers();
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'student',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(false);
    setGeneratedPassword('');

    const payload: CreateUserRequest = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
      role: formData.role as 'admin' | 'teacher' | 'student',
    };

    const result = await createUser(payload);

    if (result) {
      setGeneratedPassword(result.default_password || 'demo123');
      setShowSuccess(true);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'student',
      });

      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
      }, 3000);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
        <CardTitle>Create New User</CardTitle>
        <CardDescription className="text-blue-100">
          Auto-generates profile with ID
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {showSuccess && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <AlertMessage
              message={`User created successfully! Default Password: ${generatedPassword}`}
              type="success"
              onClose={() => setShowSuccess(false)}
            />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <AlertMessage message={error} type="error" onClose={() => {}} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name and Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Role */}
          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-generation info */}
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
            ✓ New users are created with <strong>Active</strong> status by default
            <br />
            ✓ Student ID format: <code className="bg-white px-1">MCC{'{year}'}-{'{00000}'}</code>
            <br />
            ✓ Employee ID format: <code className="bg-white px-1">EMP{'{year}'}-{'{000}'}</code>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  role: 'student',
                });
                setShowSuccess(false);
              }}
              className="flex-1"
            >
              Clear
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500">
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
