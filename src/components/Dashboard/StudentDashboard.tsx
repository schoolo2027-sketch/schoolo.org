import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentStudent } from "@/hooks/useCurrentStudent";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  User, Phone, MapPin, Droplets, GraduationCap, Calendar,
  Hash, Shield, BookOpen, Clock, BarChart3, ClipboardCheck,
  CreditCard, Bell, ChevronRight, Download, Printer, Eye,
  Award, CheckCircle2, AlertCircle, FileText, Sparkles, Contact, Edit3, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isPast } from "date-fns";

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { student, isLoading: studentLoading, schoolId: effectiveSchoolId } = useCurrentStudent();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [editFormData, setEditFormData] = useState({
    student_name: "",
    guardian_name: "",
    phone: "",
    guardian_phone: "",
    address: "",
    blood_group: "",
    date_of_birth: "",
    photo: "",
  });

  useEffect(() => {
    if (student) {
      setEditFormData({
        student_name: student.student_name || "",
        guardian_name: student.guardian_name || "",
        phone: student.phone || "",
        guardian_phone: (student as any).guardian_phone || student.phone || "",
        address: student.address || "",
        blood_group: student.blood_group || "",
        date_of_birth: student.date_of_birth || "",
        photo: (student as any).photo || "",
      });
    }
  }, [student]);

  // Realtime sync
  useRealtimeSync("students", [["student-self"]]);
  useRealtimeSync("attendance", [["student-attendance"]]);
  useRealtimeSync("results", [["student-exams"]]);
  useRealtimeSync("homework", [["student-homework"]]);
  useRealtimeSync("student_payments", [["student-payments"]]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id) return;
    setIsSavingProfile(true);

    try {
      const { error: studentErr } = await supabase
        .from("students")
        .update({
          student_name: editFormData.student_name.trim(),
          guardian_name: editFormData.guardian_name.trim(),
          phone: editFormData.phone.trim(),
          address: editFormData.address.trim(),
          blood_group: editFormData.blood_group || null,
          date_of_birth: editFormData.date_of_birth || null,
          photo: editFormData.photo || null,
        })
        .eq("id", student.id);

      if (studentErr) throw studentErr;

      if (user?.id) {
        await supabase
          .from("profiles")
          .update({
            full_name: editFormData.student_name.trim(),
            phone: editFormData.phone.trim(),
            avatar_url: editFormData.photo || null,
          })
          .eq("user_id", user.id);
      }

      toast({
        title: "Profile Updated",
        description: "Your student profile information has been saved successfully.",
      });

      setShowEditProfileModal(false);
      queryClient.invalidateQueries({ queryKey: ["student-self"] });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update profile details.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // School info
  const { data: school } = useQuery({
    queryKey: ["student-school", effectiveSchoolId],
    queryFn: async () => {
      if (!effectiveSchoolId) return null;
      const { data } = await supabase
        .from("schools")
        .select("*")
        .eq("id", effectiveSchoolId)
        .maybeSingle();
      return data;
    },
    enabled: !!effectiveSchoolId,
  });

  // Attendance stats for this student
  const { data: attendanceStats } = useQuery({
    queryKey: ["student-attendance-stats", student?.id, effectiveSchoolId],
    queryFn: async () => {
      if (!student?.id || !effectiveSchoolId) return { rate: "100%", present: 0, total: 0 };
      const { data } = await supabase
        .from("attendance")
        .select("status, date")
        .eq("school_id", effectiveSchoolId)
        .eq("student_id", student.id);

      const total = data?.length || 0;
      const present = data?.filter((a: any) => a.status === "present").length || 0;
      const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : "100%";
      return { rate, present, total, list: (data || []).slice(0, 5) };
    },
    enabled: !!student?.id && !!effectiveSchoolId,
  });

  // Latest homework for student's class
  const { data: homeworkList = [] } = useQuery({
    queryKey: ["student-homework-list", student?.class_id, effectiveSchoolId],
    queryFn: async () => {
      if (!student?.class_id || !effectiveSchoolId) return [];
      let query = supabase
        .from("homework")
        .select("*, subjects(subject_name), teachers(teacher_name)")
        .eq("school_id", effectiveSchoolId)
        .eq("class_id", student.class_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (student.section_id) {
        query = query.or(`section_id.eq.${student.section_id},section_id.is.null`);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!student?.class_id && !!effectiveSchoolId,
  });

  // Latest published results for student
  const { data: latestExams = [] } = useQuery({
    queryKey: ["student-latest-results", student?.class_id, effectiveSchoolId],
    queryFn: async () => {
      if (!effectiveSchoolId) return [];
      const { data } = await supabase
        .from("results")
        .select("*")
        .eq("school_id", effectiveSchoolId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data || []).filter((r: any) => !r.class_id || r.class_id === student?.class_id);
    },
    enabled: !!effectiveSchoolId,
  });

  // Latest school notices
  const { data: notices = [] } = useQuery({
    queryKey: ["student-notices", effectiveSchoolId],
    queryFn: async () => {
      if (!effectiveSchoolId) return [];
      const { data } = await supabase
        .from("notices")
        .select("*")
        .eq("school_id", effectiveSchoolId)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!effectiveSchoolId,
  });

  // Student Payment status
  const { data: paymentInfo } = useQuery({
    queryKey: ["student-payment-status", student?.id, effectiveSchoolId],
    queryFn: async () => {
      if (!student?.id || !effectiveSchoolId) return { totalPaid: 0, dueCount: 0 };
      const { data } = await (supabase.from as any)("student_payments")
        .select("amount, payment_status")
        .eq("student_id", student.id)
        .eq("school_id", effectiveSchoolId);

      const totalPaid = data
        ?.filter((p: any) => p.payment_status === "paid")
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0;

      const dueCount = data?.filter((p: any) => p.payment_status === "pending" || p.payment_status === "unpaid").length || 0;

      return { totalPaid, dueCount };
    },
    enabled: !!student?.id && !!effectiveSchoolId,
  });

  const rawStudent = (student || {}) as any;
  const photoUrl = rawStudent?.photo_url || rawStudent?.photo
    ? (rawStudent?.photo_url || (typeof rawStudent.photo === "string" && rawStudent.photo.startsWith("http") ? rawStudent.photo : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/student-photos/${rawStudent.photo}`))
    : null;

  const initials = student?.student_name?.trim().split(/\s+/).filter(Boolean).map((n: string) => n[0] || "").join("").toUpperCase().slice(0, 2) || "S";
  const studentName = student?.student_name || profile?.full_name || "Student";
  const className = (student?.classes as any)?.class_name || "Not Assigned";
  const sectionName = (student?.sections as any)?.section_name || "A";
  const shift = (student?.classes as any)?.shift || "Morning";
  const version = (student?.classes as any)?.version || "Bangla";
  const studentRoll = student?.roll || "N/A";
  const studentIdNumber = student?.student_id || student?.id?.slice(0, 8) || "STU-001";

  const upcomingHomeworkCount = homeworkList.filter((hw: any) => !hw.deadline || !isPast(new Date(hw.deadline))).length;

  return (
    <div className="space-y-6">
      {/* =========================================================
          HERO BANNER: Student Identity & School Branding Card
      ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-blue-700 text-white shadow-lg p-6">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-48 h-48 rounded-full bg-accent/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Student Profile Info */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-3 border-white/80 shadow-md ring-4 ring-white/20">
              <AvatarImage src={photoUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-white text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {studentName}
                </h1>
                <Badge className="bg-white/20 hover:bg-white/30 text-white text-xs border-0 font-medium">
                  {student?.is_active ? "Active Student" : "Inactive"}
                </Badge>
              </div>

              <p className="text-sm text-white/80 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 shrink-0 text-white/90" />
                <span>{className} • Sec: {sectionName} • Roll: {studentRoll}</span>
              </p>

              <div className="flex items-center gap-3 text-xs text-white/75 font-mono pt-0.5">
                <span>ID: {studentIdNumber}</span>
                <span>•</span>
                <span className="capitalize">{shift} • {version}</span>
                {student?.blood_group && (
                  <>
                    <span>•</span>
                    <span className="bg-red-500/80 px-1.5 py-0.2 rounded text-[10px] text-white font-sans font-bold">
                      {student.blood_group}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action: Open Digital ID Card Modal & Edit Profile */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              onClick={() => setShowEditProfileModal(true)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold shadow-sm flex items-center gap-2 text-xs sm:text-sm"
            >
              <Edit3 className="h-4 w-4 text-white" />
              Edit Profile
            </Button>
            <Button
              onClick={() => setShowIdCardModal(true)}
              className="bg-white hover:bg-white/90 text-primary font-semibold shadow-sm flex items-center gap-2 text-xs sm:text-sm"
            >
              <Contact className="h-4 w-4 text-primary" />
              View Digital ID Card
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================
          4 KEY METRICS / STAT CARDS
      ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div
          onClick={() => navigate("/my-attendance")}
          className="bg-card hover:bg-muted/40 cursor-pointer rounded-xl border border-border p-4 shadow-sm transition-all hover:shadow-md group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance</p>
            <h3 className="text-2xl font-bold text-foreground">{attendanceStats?.rate || "100%"}</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Total {attendanceStats?.present || 0} days present
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <ClipboardCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Results / Exam GPA */}
        <div
          onClick={() => navigate("/my-results")}
          className="bg-card hover:bg-muted/40 cursor-pointer rounded-xl border border-border p-4 shadow-sm transition-all hover:shadow-md group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exam Results</p>
            <h3 className="text-2xl font-bold text-foreground">
              {latestExams.length > 0 ? "Published" : "Results"}
            </h3>
            <p className="text-xs text-primary font-medium flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> View Marks & Grades
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>

        {/* Active Homework */}
        <div
          onClick={() => navigate("/my-homework")}
          className="bg-card hover:bg-muted/40 cursor-pointer rounded-xl border border-border p-4 shadow-sm transition-all hover:shadow-md group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Homework</p>
            <h3 className="text-2xl font-bold text-foreground">{upcomingHomeworkCount} Tasks</h3>
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Assignments & Tasks
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        {/* Payments / Accounts */}
        <div
          onClick={() => navigate("/my-payments")}
          className="bg-card hover:bg-muted/40 cursor-pointer rounded-xl border border-border p-4 shadow-sm transition-all hover:shadow-md group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payments & Receipts</p>
            <h3 className="text-2xl font-bold text-foreground">
              ৳ {paymentInfo?.totalPaid || 0}
            </h3>
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Receipts & Statement
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* =========================================================
          STUDENT WORKSPACE TABS & WIDGETS
      ========================================================= */}
      <Tabs defaultValue="homework" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="homework" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            Homework ({homeworkList.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            Results
          </TabsTrigger>
          <TabsTrigger value="notices" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Bell className="h-3.5 w-3.5" />
            Notices ({notices.length})
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* HOMEWORK TAB */}
        <TabsContent value="homework" className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Recent Homework & Assignments
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-homework")}
                className="text-xs text-primary hover:text-primary/90"
              >
                View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {homeworkList.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60" />
                <p>No pending homework right now!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {homeworkList.map((hw: any) => {
                  const isOverdue = hw.deadline && isPast(new Date(hw.deadline));
                  return (
                    <div key={hw.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                            {hw.subjects?.subject_name || "General"}
                          </Badge>
                          <h4 className="font-semibold text-sm text-foreground truncate">{hw.title}</h4>
                        </div>
                        {hw.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{hw.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                          {hw.teachers?.teacher_name && <span>Teacher: {hw.teachers.teacher_name}</span>}
                          {hw.deadline && (
                            <span className={isOverdue ? "text-red-500 font-medium" : "text-emerald-600 font-medium"}>
                              Due: {format(new Date(hw.deadline), "dd MMM yyyy")}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/my-homework")}
                        className="text-xs shrink-0"
                      >
                        Details
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* RESULTS TAB */}
        <TabsContent value="results" className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Published Exam Results
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-results")}
                className="text-xs text-primary hover:text-primary/90"
              >
                View Marks & Grades <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {latestExams.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                No exam results published yet
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {latestExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    onClick={() => navigate("/my-results")}
                    className="p-4 rounded-xl border border-border hover:border-primary/40 bg-muted/20 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">{exam.exam_name}</h4>
                      <p className="text-xs text-muted-foreground">Session: {exam.academic_year || "2026"}</p>
                      <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] border-0">
                        Result Ready
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* NOTICES TAB */}
        <TabsContent value="notices" className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                School Notice Board
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/notices")}
                className="text-xs text-primary hover:text-primary/90"
              >
                All Notices <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {notices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No new notices available
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notices.map((notice: any) => (
                  <div key={notice.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-foreground">{notice.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {notice.created_at ? format(new Date(notice.created_at), "dd MMM yyyy, hh:mm a") : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Personal & Guardian Details
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditProfileModal(true)}
                className="text-xs flex items-center gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted/20 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground block font-medium">Student Full Name</span>
                <span className="font-semibold text-foreground">{student?.student_name || "N/A"}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground block font-medium">Student Phone Number</span>
                <span className="font-semibold text-foreground">{student?.phone || "N/A"}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground block font-medium">Guardian Name</span>
                <span className="font-semibold text-foreground">{student?.guardian_name || "N/A"}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground block font-medium">Guardian Phone Number</span>
                <span className="font-semibold text-foreground">{rawStudent?.guardian_phone || rawStudent?.phone || "N/A"}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground block font-medium">Blood Group</span>
                <span className="font-semibold text-foreground">{student?.blood_group || "N/A"}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground block font-medium">Date of Birth</span>
                <span className="font-semibold text-foreground">
                  {student?.date_of_birth ? format(new Date(student.date_of_birth), "dd MMMM yyyy") : "N/A"}
                </span>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border sm:col-span-2">
                <span className="text-xs text-muted-foreground block font-medium">Address</span>
                <span className="font-semibold text-foreground">{student?.address || "N/A"}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================
          EDIT PROFILE MODAL
      ========================================================= */}
      {showEditProfileModal && (
        <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" />
                Edit Profile Information
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="stu_name">Student Name</Label>
                  <Input
                    id="stu_name"
                    value={editFormData.student_name}
                    onChange={(e) => setEditFormData({ ...editFormData, student_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="stu_phone">Student Phone</Label>
                  <Input
                    id="stu_phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="017xxxxxxxx"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="stu_guardian">Guardian Name</Label>
                  <Input
                    id="stu_guardian"
                    value={editFormData.guardian_name}
                    onChange={(e) => setEditFormData({ ...editFormData, guardian_name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="stu_bg">Blood Group</Label>
                  <Select
                    value={editFormData.blood_group || "none"}
                    onValueChange={(val) => setEditFormData({ ...editFormData, blood_group: val === "none" ? "" : val })}
                  >
                    <SelectTrigger id="stu_bg">
                      <SelectValue placeholder="Select Blood Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not Specified</SelectItem>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="stu_dob">Date of Birth</Label>
                  <Input
                    id="stu_dob"
                    type="date"
                    value={editFormData.date_of_birth}
                    onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="stu_addr">Address</Label>
                  <Input
                    id="stu_addr"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="House, Road, City"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="stu_photo">Photo URL</Label>
                  <Input
                    id="stu_photo"
                    value={editFormData.photo}
                    onChange={(e) => setEditFormData({ ...editFormData, photo: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditProfileModal(false)}
                  disabled={isSavingProfile}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingProfile}
                  className="bg-primary text-white flex items-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================
          DIGITAL ID CARD DIALOG POPUP
      ========================================================= */}
      {showIdCardModal && (
        <Dialog open={showIdCardModal} onOpenChange={setShowIdCardModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Contact className="h-4 w-4 text-primary" />
                Digital Student ID Card
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 flex flex-col items-center gap-4">
              {/* ID Card Box */}
              <div className="w-[240px] h-[360px] bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 flex flex-col text-slate-800 select-none">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-3 text-center">
                  <h4 className="font-bold text-xs uppercase truncate">{school?.school_name || "SCHOOL NAME"}</h4>
                  <p className="text-[9px] text-white/80 truncate">{school?.school_address || "Bangladesh"}</p>
                  <div className="mt-1.5 inline-block bg-white text-blue-900 px-2.5 py-0.5 rounded-full text-[8.5px] font-extrabold">
                    STUDENT IDENTITY CARD
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-3 flex flex-col items-center justify-between text-center">
                  <Avatar className="h-16 w-16 border-2 border-blue-600 shadow-sm">
                    <AvatarImage src={photoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-base font-bold bg-blue-700 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase">{studentName}</h3>
                    <p className="text-[10px] font-semibold text-slate-600 mt-0.5">
                      {className} • Sec: {sectionName} • Roll: {studentRoll}
                    </p>
                  </div>

                  <div className="w-full bg-slate-50 rounded p-1.5 text-[8.5px] space-y-0.5 border text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-500">ID:</span>
                      <span className="font-bold font-mono text-slate-900">{studentIdNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Session:</span>
                      <span className="font-semibold text-emerald-700">2026</span>
                    </div>
                    {rawStudent?.guardian_phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phone:</span>
                        <span className="font-semibold">{rawStudent.guardian_phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 text-[8px] text-slate-400">
                    <span>EIIN: {school?.eiin || "N/A"}</span>
                    <span className="font-serif italic text-slate-700">Principal</span>
                  </div>
                </div>
                <div className="h-1.5 bg-blue-700 w-full" />
              </div>

              <div className="flex gap-2 w-full justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowIdCardModal(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    window.print();
                  }}
                  className="bg-primary text-white flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print ID Card
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StudentDashboard;
