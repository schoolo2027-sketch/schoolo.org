import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { RealtimeSyncProvider } from "@/contexts/RealtimeSyncContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MasterDashboard from "@/components/Dashboard/MasterDashboard";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SchoolsPage from "@/components/Admin/SchoolsPage";
import StudentsPage from "@/components/Admin/StudentsPage";
import TeachersPage from "@/components/Admin/TeachersPage";
import StaffPage from "@/components/Admin/StaffPage";
import ClassesPage from "@/components/Admin/ClassesPage";
import AttendancePage from "@/components/Admin/AttendancePage";
import ResultsPage from "@/components/Admin/ResultsPage";
import MarkEntryPage from "@/components/Admin/MarkEntryPage";
import HomeworkPage from "@/components/Admin/HomeworkPage";
import NoticesPage from "@/components/Admin/NoticesPage";
import SettingsPage from "@/components/Admin/SettingsPage";
import AccountsPage from "@/pages/AccountsPage";
import ReportsPage from "@/components/Admin/ReportsPage";
import PromotionPage from "@/components/Admin/PromotionPage";
import ExamToolsPage from "@/components/Admin/ExamToolsPage";
import IDCardGenerator from "@/components/Admin/IDCardGenerator";
import AdmissionFormPage from "@/components/Admin/AdmissionFormPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import StudentPaymentPage from "@/components/Student/StudentPaymentPage";
import StudentAttendancePage from "@/components/Student/StudentAttendancePage";
import StudentResultsPage from "@/components/Student/StudentResultsPage";
import StudentHomeworkPage from "@/components/Student/StudentHomeworkPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const protectedRoute = (element: React.ReactNode, allowedRoles?: string[]) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <DashboardLayout>{element}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppSettingsProvider>
        <LanguageProvider>
        <AuthProvider>
          <RealtimeSyncProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected routes with role-based access */}
              <Route path="/" element={protectedRoute(<MasterDashboard />)} />
              <Route path="/schools" element={protectedRoute(<SchoolsPage />, ["master_admin"])} />
              <Route path="/students" element={protectedRoute(<StudentsPage />, ["school_admin", "sub_admin", "teacher"])} />
              <Route path="/teachers" element={protectedRoute(<TeachersPage />, ["school_admin"])} />
              <Route path="/staff" element={protectedRoute(<StaffPage />, ["school_admin"])} />
              <Route path="/classes" element={protectedRoute(<ClassesPage />, ["master_admin", "school_admin", "sub_admin", "teacher"])} />
              <Route path="/attendance" element={protectedRoute(<AttendancePage />, ["school_admin", "teacher"])} />
              <Route path="/results" element={protectedRoute(<ResultsPage />, ["school_admin", "teacher"])} />
              <Route path="/results/mark-entry" element={protectedRoute(<MarkEntryPage />, ["school_admin", "teacher"])} />
              <Route path="/id-cards" element={protectedRoute(<IDCardGenerator />, ["school_admin", "sub_admin", "teacher"])} />
              <Route path="/admission-form" element={protectedRoute(<AdmissionFormPage />, ["school_admin", "sub_admin", "teacher"])} />
              <Route path="/homework" element={protectedRoute(<HomeworkPage />, ["school_admin", "teacher"])} />
              <Route path="/my-payments" element={protectedRoute(<StudentPaymentPage />, ["student"])} />
              <Route path="/my-attendance" element={protectedRoute(<StudentAttendancePage />, ["student"])} />
              <Route path="/my-results" element={protectedRoute(<StudentResultsPage />, ["student"])} />
              <Route path="/my-homework" element={protectedRoute(<StudentHomeworkPage />, ["student"])} />
              <Route path="/notices" element={protectedRoute(<NoticesPage />, ["master_admin", "school_admin", "teacher", "student"])} />
              <Route path="/settings" element={protectedRoute(<SettingsPage />, ["master_admin", "school_admin"])} />
              <Route path="/promotion" element={protectedRoute(<PromotionPage />, ["school_admin"])} />
              <Route path="/exam" element={protectedRoute(<ExamToolsPage />, ["school_admin", "sub_admin", "teacher"])} />
              <Route path="/reports" element={protectedRoute(<ReportsPage />, ["master_admin", "school_admin"])} />
              <Route path="/ai-tools" element={protectedRoute(<PlaceholderPage title="AI Question Paper & Notice" description="AI generated question papers, syllabus & notice generator" />, ["master_admin", "school_admin", "teacher"])} />
              <Route path="/accounts" element={protectedRoute(<AccountsPage />, ["school_admin", "sub_admin", "accounts", "teacher"])} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RealtimeSyncProvider>
        </AuthProvider>
        </LanguageProvider>
        </AppSettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
