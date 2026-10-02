import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, School, RotateCcw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import SchoolCard from "./SchoolCard";
import SchoolFormDialog, { SchoolFormData, emptySchoolForm } from "./SchoolFormDialog";
import SchoolProfileDialog from "./SchoolProfileDialog";
import SchoolAgreementDialog from "./SchoolAgreementDialog";
import SchoolReportDialog from "./SchoolReportDialog";

const SchoolsPage = () => {
  const { roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSchoolName, setDeleteSchoolName] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SchoolFormData>(emptySchoolForm);
  const [profileSchool, setProfileSchool] = useState<any | null>(null);
  const [agreementSchool, setAgreementSchool] = useState<any | null>(null);
  const [reportSchool, setReportSchool] = useState<any | null>(null);
  const [viewTab, setViewTab] = useState("active");

  const isMasterAdmin = roles.includes("master_admin");

  // Fetch active schools
  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isMasterAdmin,
  });

  // Fetch soft-deleted schools
  const { data: deletedSchools = [] } = useQuery({
    queryKey: ["schools-deleted"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isMasterAdmin,
  });

  // Realtime
  useEffect(() => {
    if (!isMasterAdmin) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const timer = setTimeout(() => {
      channel = supabase
        .channel(`schools-realtime-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "schools" }, () => {
          queryClient.invalidateQueries({ queryKey: ["schools"] });
          queryClient.invalidateQueries({ queryKey: ["schools-deleted"] });
        })
        .subscribe();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [isMasterAdmin, queryClient]);

  const createMutation = useMutation({
    mutationFn: async (f: SchoolFormData) => {
      const { data: newSchool, error } = await supabase.from("schools").insert({
        school_name: f.school_name,
        short_name: f.short_name || null,
        eiin: f.eiin || null,
        school_address: f.school_address || null,
        school_phone: f.school_phone || null,
        school_email: f.school_email || null,
        website: f.website || null,
        school_logo: f.school_logo || null,
        plan_name: f.plan_name,
        max_students: f.max_students,
        max_teachers: f.max_teachers,
        subscription_expiry: f.subscription_expiry || null,
        student_login_enabled: f.student_login_enabled,
        teacher_login_enabled: f.teacher_login_enabled,
        admin_name: f.admin_name || null,
        admin_email: f.admin_email || null,
        is_active: f.is_active,
        established_year: f.established_year ? parseInt(f.established_year) : null,
        principal_name: f.principal_name || null,
        principal_signature: f.principal_signature || null,
        registrar_signature: f.registrar_signature || null,
        admin_id_number: f.admin_id_number || null,
        default_version: f.default_version || "bangla",
        bkash_merchant: f.bkash_merchant || null,
        nagad_merchant: f.nagad_merchant || null,
        sslcommerz_store_id: f.sslcommerz_store_id || null,
      }).select().single();
      if (error) throw error;

      // Create admin user if credentials provided
      if (f.admin_email && f.admin_password) {
        try {
          const { data: result, error: fnError } = await supabase.functions.invoke("create-school-admin", {
            body: {
              admin_email: f.admin_email,
              admin_password: f.admin_password,
              admin_name: f.admin_name,
              school_id: newSchool.id,
            },
          });
          const authMessage = result?.error || fnError?.message || "";
          if (authMessage) {
            const lower = authMessage.toLowerCase();
            if (lower.includes("already") || lower.includes("email_exists")) {
              toast({ title: "School created, admin login unchanged", description: authMessage, variant: "default" });
              return;
            }
            toast({
              title: "School created, but Admin User setup failed",
              description: authMessage.includes("Edge Function") 
                ? "Edge Function 'create-school-admin' is not deployed yet. Please deploy functions via CLI or create the user manually in Supabase." 
                : authMessage,
              variant: "destructive",
            });
          }
        } catch (edgeErr: any) {
          toast({
            title: "School created, but Admin User setup failed",
            description: "Edge Function is not deployed yet. Please deploy functions using 'npx supabase functions deploy create-school-admin --no-verify-jwt'.",
            variant: "destructive",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast({ title: "School created successfully" });
      setDialogOpen(false);
      setForm(emptySchoolForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: SchoolFormData }) => {
      const { error } = await supabase.from("schools").update({
        school_name: f.school_name,
        short_name: f.short_name || null,
        eiin: f.eiin || null,
        school_address: f.school_address || null,
        school_phone: f.school_phone || null,
        school_email: f.school_email || null,
        website: f.website || null,
        school_logo: f.school_logo || null,
        plan_name: f.plan_name,
        max_students: f.max_students,
        max_teachers: f.max_teachers,
        subscription_expiry: f.subscription_expiry || null,
        student_login_enabled: f.student_login_enabled,
        teacher_login_enabled: f.teacher_login_enabled,
        is_active: f.is_active,
        established_year: f.established_year ? parseInt(f.established_year) : null,
        principal_name: f.principal_name || null,
        principal_signature: f.principal_signature || null,
        registrar_signature: f.registrar_signature || null,
        admin_id_number: f.admin_id_number || null,
        default_version: f.default_version || "bangla",
        bkash_merchant: f.bkash_merchant || null,
        nagad_merchant: f.nagad_merchant || null,
        sslcommerz_store_id: f.sslcommerz_store_id || null,
      }).eq("id", id);
      if (error) throw error;

      // If admin email/password changed, update via edge function
      if (f.admin_email && f.admin_password) {
        try {
          const { data: result, error: fnError } = await supabase.functions.invoke("create-school-admin", {
            body: {
              admin_email: f.admin_email,
              admin_password: f.admin_password,
              admin_name: f.admin_name,
              school_id: id,
            },
          });
          // Ignore "already exists" errors on update
          const msg = result?.error || fnError?.message || "";
          if (msg && !msg.toLowerCase().includes("already") && !msg.toLowerCase().includes("আগেই")) {
            toast({
              title: "Admin user update issue",
              description: msg.includes("Edge Function")
                ? "Edge Function 'create-school-admin' is not deployed yet."
                : msg,
              variant: "destructive",
            });
          }
        } catch (err: any) {
          // Graceful handling if edge function is not deployed
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast({ title: "School updated successfully" });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptySchoolForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("schools").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast({ title: "School status updated" });
    },
  });

  // Soft delete: set deleted_at timestamp
  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schools").update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["schools-deleted"] });
      toast({ title: "School moved to trash. It will be permanently deleted after 30 days." });
      setDeleteId(null);
      setDeleteConfirmText("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Restore soft-deleted school
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schools").update({
        deleted_at: null,
        is_active: true,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["schools-deleted"] });
      toast({ title: "School restored successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Permanent delete
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Session not found. Please login again.");
      const { data, error } = await supabase.functions.invoke("delete-user", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { type: "school", school_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["schools-deleted"] });
      toast({ title: "School permanently deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = schools.filter((s: any) =>
    s.school_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.school_code || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.eiin || "").toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (school: any) => {
    setEditId(school.id);
    setForm({
      school_name: school.school_name || "",
      short_name: school.short_name || "",
      eiin: school.eiin || "",
      school_code: school.school_code || "",
      school_address: school.school_address || "",
      school_phone: school.school_phone || "",
      school_email: school.school_email || "",
      website: school.website || "",
      school_logo: school.school_logo || "",
      plan_name: school.plan_name || "free",
      max_students: school.max_students || 100,
      max_teachers: school.max_teachers || 20,
      subscription_expiry: school.subscription_expiry || "",
      is_active: school.is_active ?? true,
      student_login_enabled: school.student_login_enabled ?? true,
      teacher_login_enabled: school.teacher_login_enabled ?? true,
      admin_name: school.admin_name || "",
      admin_email: school.admin_email || "",
      admin_password: "",
      admin_id_number: school.admin_id_number || "",
      established_year: school.established_year ? String(school.established_year) : "",
      default_version: school.default_version || "bangla",
      principal_name: school.principal_name || "",
      principal_signature: school.principal_signature || "",
      registrar_signature: school.registrar_signature || "",
      bkash_merchant: school.bkash_merchant || "",
      nagad_merchant: school.nagad_merchant || "",
      sslcommerz_store_id: school.sslcommerz_store_id || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.school_name.trim()) {
      toast({ title: "School name is required", variant: "destructive" });
      return;
    }
    if (!editId && form.admin_email && !form.admin_password) {
      toast({ title: "Admin password is required", variant: "destructive" });
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, f: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDeleteClick = (schoolOrId: any) => {
    if (typeof schoolOrId === "string") {
      setDeleteId(schoolOrId);
      const found = schools.find((s: any) => s.id === schoolOrId);
      setDeleteSchoolName(found?.school_name || "this school");
    } else {
      setDeleteId(schoolOrId.id);
      setDeleteSchoolName(schoolOrId.school_name || "this school");
    }
    setDeleteConfirmText("");
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (!isMasterAdmin) {
    return (
      <div className="space-y-6">
        <div className="page-header"><h1 className="page-title">Schools</h1></div>
        <div className="stat-card flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Schools</h1>
          <p className="page-description">Manage all schools on the platform.</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(emptySchoolForm); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add School
        </Button>
      </div>

      <Tabs value={viewTab} onValueChange={setViewTab}>
        <TabsList>
          <TabsTrigger value="active">Active ({schools.length})</TabsTrigger>
          <TabsTrigger value="trash">Trash ({deletedSchools.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 pt-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, code, or EIIN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {isLoading ? (
            <div className="stat-card flex items-center justify-center min-h-[200px]">
              <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center min-h-[200px] gap-2">
              <School className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No schools found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((school: any) => (
                <SchoolCard
                  key={school.id}
                  school={school}
                  onEdit={openEdit}
                  onToggle={(id, is_active) => toggleMutation.mutate({ id, is_active })}
                  onDelete={handleDeleteClick}
                  onViewProfile={(s) => setProfileSchool(s)}
                  onViewAgreement={(s) => setAgreementSchool(s)}
                  onPrintReport={(s) => setReportSchool(s)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trash" className="space-y-4 pt-2">
          {deletedSchools.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center min-h-[200px] gap-2">
              <Trash2 className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Trash is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {deletedSchools.map((school: any) => {
                const daysLeft = getDaysRemaining(school.deleted_at);
                return (
                  <div key={school.id} className="stat-card p-5 space-y-3 opacity-75">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{school.school_name}</h3>
                        <p className="text-xs text-muted-foreground">{school.school_code}</p>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        {daysLeft > 0 ? `${daysLeft} days left` : "Expiring soon"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deleted on {new Date(school.deleted_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => restoreMutation.mutate(school.id)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1 flex-1" onClick={() => permanentDeleteMutation.mutate(school.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete Forever
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SchoolFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        isEditing={!!editId}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <SchoolProfileDialog school={profileSchool} open={!!profileSchool} onOpenChange={() => setProfileSchool(null)} />
      <SchoolAgreementDialog school={agreementSchool} open={!!agreementSchool} onOpenChange={() => setAgreementSchool(null)} />
      <SchoolReportDialog school={reportSchool} open={!!reportSchool} onOpenChange={() => setReportSchool(null)} />

      {/* Delete Confirmation with text input */}
      <AlertDialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will move <strong>{deleteSchoolName}</strong> to trash. The school and all its data will be kept for 30 days before permanent deletion.</p>
              <p className="text-sm font-medium text-foreground">Type <strong>DELETE</strong> to confirm:</p>
              <Input
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={() => deleteId && softDeleteMutation.mutate(deleteId)}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SchoolsPage;
