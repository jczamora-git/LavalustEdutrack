import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { User, Lock, Palette, AlertCircle, Eye, Bell, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertMessage } from "@/components/AlertMessage";

interface CourseColor {
  courseId: string;
  courseName: string;
  color: string;
}

const StudentSettings = () => {
  const { user } = useAuth();

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || "John Doe",
    email: user?.email || "student@example.com",
    // avatar will hold a URL (data URL or remote) for previewing the profile picture
    avatar: undefined as string | undefined,
  });
  // Students cannot edit name/email in-app; these are managed by the school

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");

  // Course colors state
  const [courseColors, setCourseColors] = useState<CourseColor[]>([
    { courseId: "1", courseName: "Mathematics", color: "#3B82F6" },
    { courseId: "2", courseName: "English", color: "#8B5CF6" },
    { courseId: "3", courseName: "Science", color: "#10B981" },
    { courseId: "4", courseName: "History", color: "#F59E0B" },
    { courseId: "5", courseName: "PE", color: "#EF4444" },
  ]);

  const defaultCourseColors: CourseColor[] = [
    { courseId: "1", courseName: "Mathematics", color: "#3B82F6" },
    { courseId: "2", courseName: "English", color: "#8B5CF6" },
    { courseId: "3", courseName: "Science", color: "#10B981" },
    { courseId: "4", courseName: "History", color: "#F59E0B" },
    { courseId: "5", courseName: "PE", color: "#EF4444" },
  ];

  const handleResetCourseColors = () => {
    setCourseColors(defaultCourseColors);
    setAlert({ type: "info", message: "Course colors reset to defaults" });
  };

  // Preferences state
  const [preferences, setPreferences] = useState({
    coursesSortBy: "code",
    activitiesSortBy: "dueDate",
    activitiesViewMode: "list",
    courseDisplayColumns: "3",
    gradeAlertThreshold: "B",
    enableGradeAlerts: true,
    reminderTiming: "3days",
    enableReminders: true,
    hideCompletedCourses: false,
  });

  // Alert state
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Profile handlers
  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  // Password handlers
  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setPasswordError("");
  };

  const handleChangePassword = () => {
    setPasswordError("");

    if (!passwordData.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError("New password is required");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    console.log("Changing password");
    setAlert({ type: "success", message: "Password changed successfully" });
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleForgotPassword = () => {
    const emailToUse = user?.email || profileData.email || "your email";
    setAlert({ type: "success", message: `Recovery link sent to ${emailToUse}. Check your inbox.` });
    // TODO: integrate with backend password recovery endpoint
  };

  // Course color handlers
  const handleCourseColorChange = (courseId: string, newColor: string) => {
    setCourseColors(prev =>
      prev.map(course =>
        course.courseId === courseId ? { ...course, color: newColor } : course
      )
    );
  };

  const handleSaveCourseColors = () => {
    console.log("Saving course colors:", courseColors);
  };

  // Preferences handlers
  const handlePreferenceChange = (key: string, value: string | boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePreferences = () => {
    console.log("Saving preferences:", preferences);
    setAlert({ type: "success", message: "Preferences saved successfully" });
  };

  return (
    <DashboardLayout>
      {alert && (
        <AlertMessage
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="p-8 bg-gradient-to-b from-background to-muted/30 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your profile, security, and preferences</p>
        </div>

        {/* Profile & Security Section - 2 Column Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Profile Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    disabled
                    className="disabled:bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange("email", e.target.value)}
                    disabled
                    className="disabled:bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
                      {profileData.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileData.avatar} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm text-muted-foreground">No image</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        title="Upload profile picture"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            setProfileData(prev => ({ ...prev, avatar: result }));
                            setAlert({ type: "success", message: "Profile image selected" });
                            // TODO: upload to server / Cloudinary and replace with remote URL
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="text-xs"
                      />

                      <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                              // TODO: upload to server / Cloudinary and persist the returned URL
                              // For now show a unified success toast to indicate the image was "saved"
                              setAlert({ type: "success", message: "Profile image saved" });
                            }}
                            className="h-8 px-3 rounded bg-blue-600 text-white text-xs"
                            disabled={!profileData.avatar}
                          >
                            Upload
                          </button>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileData(prev => ({ ...prev, avatar: undefined }));
                            setAlert({ type: "success", message: "Profile image removed" });
                          }}
                          className="h-8 px-3 rounded border text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">Name and Email are managed by your school and cannot be changed here.</div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {passwordError && (
                <div className="p-3 bg-red-100/70 border border-red-300 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                    placeholder="Enter your new password (minimum 8 characters)"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                    placeholder="Confirm your new password"
                  />
                </div>
              </div>

              <Button onClick={handleChangePassword} className="w-full sm:w-auto">
                Change Password
              </Button>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  Forgot password?
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preferences Section - 3 Column Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Sort & View Preferences */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-5 w-5" />
                View Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Courses Sort</Label>
                  <Select value={preferences.coursesSortBy} onValueChange={(v) => handlePreferenceChange("coursesSortBy", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="semester">Semester</SelectItem>
                      <SelectItem value="grade">Grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs">Columns</Label>
                  <Select value={preferences.courseDisplayColumns} onValueChange={(v) => handlePreferenceChange("courseDisplayColumns", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Col</SelectItem>
                      <SelectItem value="3">3 Col</SelectItem>
                      <SelectItem value="4">4 Col</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs">Activity Sort</Label>
                  <Select value={preferences.activitiesSortBy} onValueChange={(v) => handlePreferenceChange("activitiesSortBy", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs">Activity View</Label>
                  <Select value={preferences.activitiesViewMode} onValueChange={(v) => handlePreferenceChange("activitiesViewMode", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="list">List</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSavePreferences} className="w-full h-8 text-xs">
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Course Color Customization */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-5 w-5" />
                Course Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2">
                {courseColors.map((course) => (
                  <div
                    key={course.courseId}
                    className="p-2 border rounded-lg flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-medium text-white"
                        data-color={course.color}
                      >
                        <style dangerouslySetInnerHTML={{
                          __html: `[data-color="${course.color}"] { background-color: ${course.color}; }`
                        }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{course.courseName}</p>
                        <p className="text-xs text-muted-foreground">{course.color.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Color for ${course.courseName}`}
                        type="color"
                        value={course.color}
                        onChange={(e) => handleCourseColorChange(course.courseId, e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer border border-muted flex-shrink-0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveCourseColors} className="flex-1 bg-purple-600 hover:bg-purple-700 text-sm">
                  Save Colors
                </Button>

                <Button onClick={handleResetCourseColors} variant="outline" className="text-sm">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Stacked Cards */}
          <div className="flex flex-col gap-4">
            {/* Due Date Reminders (compact 3-line layout) */}
              <Card className="h-auto shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Bell className="h-4 w-4" />
                    Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Description */}
                  <p className="text-xs text-muted-foreground mb-2">Get notified before assignments are due</p>
                  
                  {/* single row: toggle + label on left, select on right */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {/* compact toggle button */}
                      <button
                        type="button"
                        aria-label="Toggle reminders"
                        onClick={() => {
                          const newValue = !preferences.enableReminders;
                          handlePreferenceChange("enableReminders", newValue);
                          setAlert({ 
                            type: "success", 
                            message: newValue ? "Reminders enabled" : "Reminders disabled" 
                          });
                        }}
                        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors border-2 ${preferences.enableReminders ? 'bg-primary border-primary' : 'bg-muted border-muted-foreground/20'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${preferences.enableReminders ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                      <span className="text-xs font-medium">Enable reminders</span>
                    </div>

                    {preferences.enableReminders && (
                      <div className="w-40">
                        <Select value={preferences.reminderTiming} onValueChange={(v) => {
                          handlePreferenceChange("reminderTiming", v);
                          const timingLabels: Record<string, string> = {
                            "1day": "1 day",
                            "3days": "3 days",
                            "1week": "1 week",
                            "ondue": "on due date"
                          };
                          setAlert({ 
                            type: "success", 
                            message: `Reminders set to ${timingLabels[v] || v}` 
                          });
                        }}>
                          <SelectTrigger className="h-7 text-xs w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1day">1 day before</SelectItem>
                            <SelectItem value="3days">3 days before</SelectItem>
                            <SelectItem value="1week">1 week before</SelectItem>
                            <SelectItem value="ondue">On due date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            {/* Grade Alerts (compact 3-line layout) */}
            <Card className="h-auto shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Grade Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                <p className="text-xs text-muted-foreground mb-2">Receive alerts when grades drop below a threshold</p>
                
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Toggle grade alerts"
                      onClick={() => {
                        const newValue = !preferences.enableGradeAlerts;
                        handlePreferenceChange("enableGradeAlerts", newValue);
                        setAlert({ 
                          type: "success", 
                          message: newValue ? "Grade alerts enabled" : "Grade alerts disabled" 
                        });
                      }}
                      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors border-2 ${preferences.enableGradeAlerts ? 'bg-primary border-primary' : 'bg-muted border-muted-foreground/20'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${preferences.enableGradeAlerts ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-xs font-medium">Enable alerts</span>
                  </div>

                  {preferences.enableGradeAlerts && (
                    <div className="w-40">
                      <Select value={preferences.gradeAlertThreshold} onValueChange={(v) => {
                        handlePreferenceChange("gradeAlertThreshold", v);
                        const gradeLabels: Record<string, string> = {
                          "A": "A (90%+)",
                          "B": "B (80-89%)",
                          "C": "C (70-79%)",
                          "D": "D (60-69%)",
                          "F": "F (Below 60%)"
                        };
                        setAlert({ 
                          type: "success", 
                          message: `Alerts enabled for ${gradeLabels[v] || v} and below` 
                        });
                      }}>
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A (90%+)</SelectItem>
                          <SelectItem value="B">B (80-89%)</SelectItem>
                          <SelectItem value="C">C (70-79%)</SelectItem>
                          <SelectItem value="D">D (60-69%)</SelectItem>
                          <SelectItem value="F">F (Below 60%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Course Display Options (compact 3-line layout) */}
            <Card className="h-auto shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4" />
                  Display Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                <p className="text-xs text-muted-foreground mb-2">Customize how your courses are displayed</p>
                
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-label="Toggle hide completed courses"
                      onClick={() => {
                        const newValue = !preferences.hideCompletedCourses;
                        handlePreferenceChange("hideCompletedCourses", newValue);
                        setAlert({ 
                          type: "success", 
                          message: newValue ? "Completed courses hidden" : "Completed courses shown" 
                        });
                      }}
                      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors border-2 flex-shrink-0 mt-0.5 ${preferences.hideCompletedCourses ? 'bg-primary border-primary' : 'bg-muted border-muted-foreground/20'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${preferences.hideCompletedCourses ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <div>
                      <span className="font-medium text-xs">Hide Completed</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Still in archive</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentSettings;
