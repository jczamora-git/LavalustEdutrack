import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

// Admin pages
import UserManagement from "./pages/admin/UserManagement";
import GradingSystem from "./pages/admin/GradingSystem";
import SubjectAssignment from "./pages/admin/SubjectAssignment";
import Announcements from "./pages/admin/Announcements";
import Payments from "./pages/admin/Payments";
import PDFGeneration from "./pages/admin/PDFGeneration";
import AdminSettings from "./pages/admin/AdminSettings";
import Teachers from "./pages/admin/users/Teachers";
import Students from "./pages/admin/users/Students";
import Subjects from "./pages/admin/users/Subjects";
import Sections from "./pages/admin/users/Sections";
import SectionDetail from "./pages/admin/users/SectionDetail";


// Teacher pages
import Courses from "./pages/teacher/Courses";
import CourseManagement from "./pages/teacher/CourseManagement";
import ActivityDetail from "./pages/teacher/ActivityDetail";
import Activities from "./pages/teacher/Activities";
import StudentManagement from "./pages/teacher/StudentManagement";
import StudentDetail from "./pages/teacher/StudentDetail";
import GradeInput from "./pages/teacher/GradeInput";
import GradeInputEdit from "./pages/teacher/GradeInputEdit";
import TeacherSettings from "./pages/teacher/TeacherSettings";

// Student pages
import MyCourses from "./pages/student/MyCourses";
import CourseDetails from "./pages/student/CourseDetails";
import MyActivities from "./pages/student/MyActivities";
import MyGrades from "./pages/student/MyGrades";
import MyProgress from "./pages/student/MyProgress";
import CourseGradeDetail from "./pages/student/CourseGradeDetail";
import StudentSettings from "./pages/student/StudentSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/courses" element={<ProtectedRoute requiredRole="student"><MyCourses /></ProtectedRoute>} />
            <Route path="/student/activities" element={<ProtectedRoute requiredRole="student"><MyActivities /></ProtectedRoute>} />
            <Route path="/student/grades" element={<ProtectedRoute requiredRole="student"><MyGrades /></ProtectedRoute>} />
            <Route path="/student/progress" element={<ProtectedRoute requiredRole="student"><MyProgress /></ProtectedRoute>} />
            <Route path="/student/course-grade-detail" element={<ProtectedRoute requiredRole="student"><CourseGradeDetail /></ProtectedRoute>} />
            <Route path="/student/settings" element={<ProtectedRoute requiredRole="student"><StudentSettings /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId" element={<ProtectedRoute requiredRole="student"><CourseDetails /></ProtectedRoute>} />
            
            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute requiredRole="teacher"><Courses /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/activities/:activityId" element={<ProtectedRoute requiredRole="teacher"><ActivityDetail /></ProtectedRoute>} />
            <Route path="/teacher/activities" element={<ProtectedRoute requiredRole="teacher"><Activities /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute requiredRole="teacher"><StudentManagement /></ProtectedRoute>} />
            <Route path="/teacher/student-detail" element={<ProtectedRoute requiredRole="teacher"><StudentDetail /></ProtectedRoute>} />
            <Route path="/teacher/grades" element={<ProtectedRoute requiredRole="teacher"><GradeInput /></ProtectedRoute>} />
            <Route path="/teacher/grade-input-edit" element={<ProtectedRoute requiredRole="teacher"><GradeInputEdit /></ProtectedRoute>} />
            <Route path="/teacher/settings" element={<ProtectedRoute requiredRole="teacher"><TeacherSettings /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId" element={<ProtectedRoute requiredRole="teacher"><CourseManagement /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/users/teachers" element={<ProtectedRoute requiredRole="admin"><Teachers /></ProtectedRoute>} />
            <Route path="/admin/users/students" element={<ProtectedRoute requiredRole="admin"><Students /></ProtectedRoute>} />
            <Route path="/admin/users/subjects" element={<ProtectedRoute requiredRole="admin"><Subjects /></ProtectedRoute>} />
            <Route path="/admin/users/sections" element={<ProtectedRoute requiredRole="admin"><Sections /></ProtectedRoute>} />
            <Route path="/admin/users/sections/:sectionId" element={<ProtectedRoute requiredRole="admin"><SectionDetail /></ProtectedRoute>} />
            <Route path="/admin/grading" element={<ProtectedRoute requiredRole="admin"><GradingSystem /></ProtectedRoute>} />
            <Route path="/admin/assignments" element={<ProtectedRoute requiredRole="admin"><SubjectAssignment /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute requiredRole="admin"><Announcements /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute requiredRole="admin"><Payments /></ProtectedRoute>} />
            <Route path="/admin/pdf" element={<ProtectedRoute requiredRole="admin"><PDFGeneration /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
