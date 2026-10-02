import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentTeacher } from "@/hooks/useCurrentTeacher";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  Users, ClipboardCheck, BookOpen, Bell, FileText, CreditCard,
  GraduationCap, Award, ChevronRight, Plus, Sparkles, Contact,
  Printer, CheckCircle2, Clock, Calendar, BarChart3, UserCheck,
  Search, Shield, Eye, Edit3, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/Dashboard/StatCard";
import AttendanceChart from "@/components/Dashboard/AttendanceChart";
import RecentNotices from "@/components/Dashboard/RecentNotices";

const TeacherDashboard = () => {
  const { profile, teacherPermissions, user } = useAuth();
  const { teacher, schoolId: effectiveSchoolId, isLoading: teacherLoading } = useCurrentTeacher();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [editFormData, setEditFormData] = useState({
    teacher_name: "",
    phone: "",
    address: "",
    blood_group: "",
    photo: "",
  });

  useEffect(() => {
    if (teacher) {
      setEditFormData({
        teacher_name: teacher.teacher_name || "",
        phone: teacher.phone || "",
        address: teacher.address || "",
        blood_group: teacher.blood_group || "",
        photo: (teacher as any).photo || "",
      });
    }
  }, [teacher]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher?.id) return;
    setIsSavingProfile(true);

    try {
      const { error: teacherErr } = await supabase
        .from("teachers")
        .update({
          teacher_name: editFormData.teacher_name.trim(),
          phone: editFormData.phone.trim(),
          address: editFormData.address.trim(),
          blood_group: editFormData.blood_group || null,
          photo: editFormData.photo || null,
        })
        .eq("id", teacher.id);

      if (teacherErr) throw teacherErr;

      if (user?.id) {
        await supabase
          .from("profiles")
          .update({
            full_name: editFormData.teacher_name.trim(),
            phone: editFormData.phone.trim(),
            avatar_url: editFormData.photo || null,
          })
          .eq("user_id", user.id);
      }

      toast({
        title: "Profile Updated",
        description: "Your teacher profile information has been saved successfully.",
      });

      setShowEditProfileModal(false);
      queryClient.invalidateQueries({ queryKey: ["teacher-self"] });
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

  const schoolId = effectiveSchoolId;

  // Fetch school details
  const { data: school } = useQuery({
    queryKey: ["teacher-school", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
      return data;
    },
    enabled: !!schoolId,
  });

  // Get teacher's assigned classes
  const { data: assignedClasses = [] } = useQuery({
    queryKey: ["teacher-assigned-classes", teacher?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase
        .from("teacher_assignments")
        .select("class_id, section_id, classes(class_name, shift, version), sections(section_name)")
        .eq("school_id", schoolId);

      if (teacher?.id) {
        query = query.eq("teacher_id", teacher.id);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const assignedClassIds = assignedClasses.map((a: any) => a.class_id).filter(Boolean);

  // Student count for assigned classes
  const { data: studentCount = 0 } = useQuery({
    queryKey: ["teacher-student-count", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return 0;
      let query = supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("is_active", true);

      if (assignedClassIds.length > 0) {
        query = query.in("class_id", assignedClassIds);
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!schoolId,
  });

  // Today's attendance for assigned classes
  const { data: todayAttendance } = useQuery({
    queryKey: ["teacher-attendance-today", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return { rate: "100%", total: 0, present: 0 };
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("attendance")
        .select("status")
        .eq("school_id", schoolId)
        .eq("date", today);

      if (assignedClassIds.length > 0) {
        query = query.in("class_id", assignedClassIds);
      }

      const { data } = await query;
      const total = data?.length || 0;
      const present = data?.filter((a: any) => a.status === "present").length || 0;
      const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : "100%";
      return { rate, total, present };
    },
    enabled: !!schoolId,
  });

  // Homework count
  const { data: homeworkList = [] } = useQuery({
    queryKey: ["teacher-homework-list", teacher?.id, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase
        .from("homework")
        .select("*, classes(class_name), sections(section_name), subjects(subject_name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (teacher?.id) {
        query = query.eq("teacher_id", teacher.id);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const teacherName = teacher?.teacher_name || profile?.full_name || "Respected Teacher";
  const designation = teacher?.designation || "Assistant Teacher";
  const department = teacher?.subject || "All Subjects";
  const teacherIdNumber = teacher?.teacher_id_number || teacher?.id?.slice(0, 8) || "TCH-001";
  const initials = teacherName.trim().split(/\s+/).filter(Boolean).map((n: string) => n[0] || "").join("").slice(0, 2).toUpperCase() || "T";

  const photoUrl = (teacher as any)?.photo_url || (teacher as any)?.photo || null;

  return (
    <div className="space-y-6">
      {/* =========================================================
          HERO BANNER: Teacher Profile & School Welcome
      ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg p-6">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-48 h-48 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Teacher Info */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-3 border-white/80 shadow-md ring-4 ring-primary/30">
              <AvatarImage src={photoUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {teacherName}
                </h1>
                <Badge className="bg-primary/80 text-white text-xs border-0 font-medium">
                  {designation}
                </Badge>
              </div>

              <p className="text-sm text-slate-300 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                <span>Department / Subject: {department}</span>
                <span>•</span>
                <span>ID: {teacherIdNumber}</span>
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                <span>{school?.school_name || "School Portal"}</span>
                {teacher?.phone && (
                  <>
                    <span>•</span>
                    <span>📞 {teacher.phone}</span>
                  </>
                )}
                {teacher?.blood_group && (
                  <>
                    <span>•</span>
                    <span className="bg-red-500/80 px-1.5 py-0.2 rounded text-[10px] text-white font-bold">
                      {teacher.blood_group}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions in Hero */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              onClick={() => setShowEditProfileModal(true)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs sm:text-sm font-semibold flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4 text-white" />
              Edit Profile
            </Button>
            <Button
              onClick={() => setShowIdCardModal(true)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs sm:text-sm font-semibold flex items-center gap-2"
            >
              <Contact className="h-4 w-4 text-primary" />
              Teacher ID Card
            </Button>
            <Button
              onClick={() => navigate("/attendance")}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs sm:text-sm flex items-center gap-2"
            >
              <ClipboardCheck className="h-4 w-4" />
              Take Attendance
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================
          4 STAT METRICS
      ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Students"
          value={studentCount}
          icon={Users}
          color="primary"
          onClick={() => navigate("/students")}
        />
        <StatCard
          title="Assigned Classes & Sections"
          value={assignedClasses.length > 0 ? assignedClasses.length : "All Classes"}
          icon={BookOpen}
          color="success"
        />
        <StatCard
          title="Today's Attendance Rate"
          value={todayAttendance?.rate || "100%"}
          icon={ClipboardCheck}
          color="info"
          onClick={() => navigate("/attendance")}
        />
        <StatCard
          title="Assigned Homework"
          value={homeworkList.length}
          icon={FileText}
          color="warning"
          onClick={() => navigate("/homework")}
        />
      </div>

      {/* =========================================================
          QUICK WORKSPACE SHORTCUTS GRID
      ========================================================= */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Teacher Workspace Quick Access
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Mark Entry */}
          <button
            onClick={() => navigate("/results/mark-entry")}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center group"
          >
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Mark Entry</span>
          </button>

          {/* Daily Attendance */}
          <button
            onClick={() => navigate("/attendance")}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-emerald-500/40 hover:bg-emerald-50/20 transition-all text-center group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Take Attendance</span>
          </button>

          {/* Give Homework */}
          <button
            onClick={() => navigate("/homework")}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-amber-500/40 hover:bg-amber-50/20 transition-all text-center group"
          >
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Homework</span>
          </button>

          {/* Exam Tools */}
          <button
            onClick={() => navigate("/exam")}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-indigo-500/40 hover:bg-indigo-50/20 transition-all text-center group"
          >
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Exams</span>
          </button>

          {/* Post Notice */}
          <button
            onClick={() => navigate("/notices")}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-blue-500/40 hover:bg-blue-50/20 transition-all text-center group"
          >
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
              <Bell className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">Post Notice</span>
          </button>

          {/* ID Card Generator */}
          <button
            onClick={() => navigate("/id-cards")}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-purple-500/40 hover:bg-purple-50/20 transition-all text-center group"
          >
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 group-hover:scale-110 transition-transform">
              <Contact className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-foreground">ID Cards</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          MAIN 2-COLUMN SECTION: ASSIGNED CLASSES + NOTICES
      ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned Classes & Recent Homework */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Classes */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                My Assigned Classes & Duties
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/students")}
                className="text-xs text-primary"
              >
                Student List <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {assignedClasses.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm bg-muted/20 rounded-lg">
                No specific class assigned to you yet (General Teacher role active).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignedClasses.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">
                        {item.classes?.class_name || "Class"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Section: {item.sections?.section_name || "All Sections"} • {item.classes?.shift || "Morning"}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/attendance")}
                      className="h-8 text-xs flex items-center gap-1"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Attendance
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Homeworks given */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Recent Homework Posted
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/homework")}
                className="text-xs text-primary"
              >
                Create New <Plus className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {homeworkList.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                No homework posted yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {homeworkList.map((hw: any) => (
                  <div key={hw.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {hw.classes?.class_name || "Class"} {hw.sections?.section_name ? `(${hw.sections.section_name})` : ""}
                        </Badge>
                        <h4 className="font-semibold text-sm text-foreground truncate">{hw.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{hw.description || "No description"}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate("/homework")}
                      className="text-xs text-primary shrink-0"
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance Chart */}
          <AttendanceChart />
        </div>

        {/* Right 1 Col: Notices & Calendar */}
        <div className="space-y-6">
          <RecentNotices />
        </div>
      </div>

      {/* =========================================================
          TEACHER ID CARD MODAL PREVIEW
      ========================================================= */}
      {showIdCardModal && (
        <Dialog open={showIdCardModal} onOpenChange={setShowIdCardModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Contact className="h-4 w-4 text-primary" />
                Teacher ID Card
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 flex flex-col items-center gap-4">
              {/* Card Container */}
              <div className="w-[240px] h-[360px] bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 flex flex-col text-slate-800 select-none">
                <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white p-3 text-center">
                  <h4 className="font-bold text-xs uppercase truncate">{school?.school_name || "SCHOOL NAME"}</h4>
                  <p className="text-[9px] text-white/80 truncate">{school?.school_address || "Bangladesh"}</p>
                  <div className="mt-1.5 inline-block bg-white text-slate-900 px-2.5 py-0.5 rounded-full text-[8.5px] font-extrabold">
                    TEACHER IDENTITY CARD
                  </div>
                </div>

                <div className="flex-1 p-3 flex flex-col items-center justify-between text-center">
                  <Avatar className="h-16 w-16 border-2 border-indigo-700 shadow-sm">
                    <AvatarImage src={photoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-base font-bold bg-slate-900 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase">{teacherName}</h3>
                    <p className="text-[10px] font-semibold text-slate-600 mt-0.5">
                      {designation} • {department}
                    </p>
                  </div>

                  <div className="w-full bg-slate-50 rounded p-1.5 text-[8.5px] space-y-0.5 border text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Teacher ID:</span>
                      <span className="font-bold font-mono text-slate-900">{teacherIdNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Session:</span>
                      <span className="font-semibold text-emerald-700">2026</span>
                    </div>
                    {teacher?.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phone:</span>
                        <span className="font-semibold">{teacher.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 text-[8px] text-slate-400">
                    <span>EIIN: {school?.eiin || "N/A"}</span>
                    <span className="font-serif italic text-slate-700">Principal</span>
                  </div>
                </div>
                <div className="h-1.5 bg-indigo-900 w-full" />
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

      {/* =========================================================
          EDIT TEACHER PROFILE MODAL
      ========================================================= */}
      {showEditProfileModal && (
        <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" />
                Edit Teacher Profile
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="tch_name">Full Name</Label>
                  <Input
                    id="tch_name"
                    value={editFormData.teacher_name}
                    onChange={(e) => setEditFormData({ ...editFormData, teacher_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tch_phone">Phone Number</Label>
                  <Input
                    id="tch_phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="017xxxxxxxx"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tch_bg">Blood Group</Label>
                  <Select
                    value={editFormData.blood_group || "none"}
                    onValueChange={(val) => setEditFormData({ ...editFormData, blood_group: val === "none" ? "" : val })}
                  >
                    <SelectTrigger id="tch_bg">
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

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="tch_addr">Address</Label>
                  <Input
                    id="tch_addr"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="Residential address"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="tch_photo">Photo URL</Label>
                  <Input
                    id="tch_photo"
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
    </div>
  );
};

export default TeacherDashboard;
