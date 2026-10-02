import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentStudent } from "@/hooks/useCurrentStudent";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Wallet, Building2, Phone, Copy, Check,
  Clock, CheckCircle2, XCircle, Send, ChevronDown, ChevronUp,
  Banknote, AlertCircle, ImagePlus, X, Image, UserCheck, Link as LinkIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import StudentAccountsLedger from "@/components/Student/StudentAccountsLedger";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const StudentPaymentPage = () => {
  const { user, schoolId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedStudentToLink, setSelectedStudentToLink] = useState("");
  const [isLinkingProfile, setIsLinkingProfile] = useState(false);

  // Available students to link if account is unlinked
  const { data: availableUnlinked = [], refetch: refetchUnlinked } = useQuery({
    queryKey: ["unlinked-students-for-link", user?.id, schoolId],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("id, student_name, roll, student_id, phone, school_id, classes(class_name)")
        .is("user_id", null)
        .eq("is_active", true);

      if (schoolId) {
        query = query.eq("school_id", schoolId);
      }

      const { data, error } = await query.order("student_name");
      if (error) {
        console.warn("Error fetching unlinked students:", error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id && !selectedFee,
  });

  // Manual linking by Student ID or Roll or Phone
  const [manualLookupValue, setManualLookupValue] = useState("");
  const [manualLookupError, setManualLookupError] = useState("");

  const handleManualLinkByInput = async () => {
    const val = manualLookupValue.trim();
    if (!val || !user?.id) {
      toast({ title: "Input required", description: "Please enter your Student ID, Roll number, or Phone number.", variant: "destructive" });
      return;
    }

    setIsLinkingProfile(true);
    setManualLookupError("");
    try {
      // Look up student by student_id, phone, or roll
      let query = supabase
        .from("students")
        .select("id, student_name, roll, student_id, school_id, user_id, is_active")
        .eq("is_active", true)
        .or(`student_id.eq.${val},phone.eq.${val},roll.eq.${val}`);

      if (schoolId) {
        query = query.eq("school_id", schoolId);
      }

      const { data: matched, error: findErr } = await query;
      if (findErr) throw findErr;

      if (!matched || matched.length === 0) {
        setManualLookupError(`No active student record found matching "${val}".`);
        toast({ title: "Not Found", description: `No active student found for "${val}".`, variant: "destructive" });
        return;
      }

      // Check if already linked to another account
      const unlinkedMatch = matched.find(s => !s.user_id || s.user_id === user.id);
      if (!unlinkedMatch) {
        const alreadyLinked = matched[0];
        setManualLookupError(`Student "${alreadyLinked.student_name}" is already linked to another login.`);
        toast({ title: "Already Linked", description: "This student profile is already linked to an account.", variant: "destructive" });
        return;
      }

      // Link to current user
      const targetStudent = unlinkedMatch;
      const { error: studentErr } = await supabase
        .from("students")
        .update({ user_id: user.id })
        .eq("id", targetStudent.id);
      if (studentErr) throw studentErr;

      if (targetStudent.school_id) {
        await supabase
          .from("profiles")
          .update({ school_id: targetStudent.school_id, full_name: targetStudent.student_name })
          .eq("user_id", user.id);

        await supabase
          .from("user_roles")
          .upsert(
            { user_id: user.id, role: "student", school_id: targetStudent.school_id },
            { onConflict: "user_id,role" }
          );
      }

      toast({ title: "Success!", description: `Profile for ${targetStudent.student_name} linked successfully.` });
      queryClient.invalidateQueries({ queryKey: ["student-self-pay"] });
      queryClient.invalidateQueries({ queryKey: ["student-self"] });
      queryClient.invalidateQueries({ queryKey: ["current-student"] });
      refetchUnlinked();
    } catch (err: any) {
      toast({ title: "Error linking profile", description: err.message, variant: "destructive" });
    } finally {
      setIsLinkingProfile(false);
    }
  };

  const handleLinkProfile = async () => {
    const targetId = selectedStudentToLink || (availableUnlinked.length === 1 ? availableUnlinked[0].id : "");
    if (!targetId || !user?.id) {
      toast({ title: "Select Profile", description: "Please select a student profile from the list to link.", variant: "destructive" });
      return;
    }
    const targetStudent = availableUnlinked.find((s: any) => s.id === targetId);
    if (!targetStudent) return;

    setIsLinkingProfile(true);
    try {
      const { error: studentErr } = await supabase
        .from("students")
        .update({ user_id: user.id })
        .eq("id", targetId);
      if (studentErr) throw studentErr;

      if (targetStudent.school_id) {
        await supabase
          .from("profiles")
          .update({ school_id: targetStudent.school_id, full_name: targetStudent.student_name })
          .eq("user_id", user.id);

        await supabase
          .from("user_roles")
          .upsert(
            { user_id: user.id, role: "student", school_id: targetStudent.school_id },
            { onConflict: "user_id,role" }
          );
      }

      toast({ title: "Success!", description: `Profile for ${targetStudent.student_name} linked successfully.` });
      queryClient.invalidateQueries({ queryKey: ["student-self-pay"] });
      queryClient.invalidateQueries({ queryKey: ["student-self"] });
      queryClient.invalidateQueries({ queryKey: ["current-student"] });
      refetchUnlinked();
    } catch (err: any) {
      toast({ title: "Error linking profile", description: err.message, variant: "destructive" });
    } finally {
      setIsLinkingProfile(false);
    }
  };

  // Get student record
  const { student, isLoading: studentLoading, schoolId: effectiveSchoolId } = useCurrentStudent();
  const studentFetched = !studentLoading;

  // Get school payment details
  const { data: school } = useQuery({
    queryKey: ["student-school-pay", effectiveSchoolId],
    queryFn: async () => {
      if (!effectiveSchoolId) return null;
      const { data } = await supabase.rpc("get_school_info_safe", { _school_id: effectiveSchoolId });
      return data?.[0] ?? null;
    },
    enabled: !!effectiveSchoolId,
  });

  // Get applicable fee rules for this student's class + global fees
  const { data: fees = [] } = useQuery({
    queryKey: ["student-fees", effectiveSchoolId, student?.class_id],
    queryFn: async () => {
      if (!effectiveSchoolId || !student?.class_id) return [];
      const { data } = await supabase
        .from("fees")
        .select("*, classes(class_name)")
        .eq("school_id", effectiveSchoolId)
        .or(`class_id.eq.${student.class_id},class_id.is.null`);
      return data || [];
    },
    enabled: !!effectiveSchoolId && !!student?.class_id,
  });

  // Get student's payment history
  const { data: myPayments = [] } = useQuery({
    queryKey: ["student-my-payments", student?.id, effectiveSchoolId],
    queryFn: async () => {
      if (!student?.id || !effectiveSchoolId) return [];
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", student.id)
        .eq("school_id", effectiveSchoolId)
        .order("date", { ascending: false });
      return data || [];
    },
    enabled: !!student?.id && !!effectiveSchoolId,
  });

  // Submit payment mutation
  const submitPayment = useMutation({
    mutationFn: async () => {
      if (!student || !selectedFee || !transactionId.trim()) throw new Error("Missing data");
      
      let receiptImagePath: string | null = null;
      
      // Upload receipt image if selected
      if (receiptFile) {
        setUploading(true);
        const fileExt = receiptFile.name.split(".").pop();
        const filePath = `${user?.id || student.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(filePath, receiptFile);
        if (uploadError) throw uploadError;
        receiptImagePath = filePath;
        setUploading(false);
      }
      
      const { error } = await supabase.from("payments").insert({
        student_id: student.id,
        school_id: effectiveSchoolId!,
        fee_type: selectedFee.fee_type,
        amount: selectedFee.amount,
        payment_method: paymentMethod as any,
        transaction_id: transactionId.trim(),
        fee_id: selectedFee.id,
        status: "pending",
        receipt_image: receiptImagePath,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ Payment Submitted", description: "Your payment is pending verification by admin." });
      queryClient.invalidateQueries({ queryKey: ["student-my-payments"] });
      setPayDialogOpen(false);
      setTransactionId("");
      setSelectedFee(null);
      setReceiptFile(null);
      setReceiptPreview(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openPayDialog = (fee: any) => {
    setSelectedFee(fee);
    if (school?.bkash_merchant) setPaymentMethod("bkash");
    else if (school?.nagad_merchant) setPaymentMethod("nagad");
    else setPaymentMethod("cash");
    setTransactionId("");
    setReceiptFile(null);
    setReceiptPreview(null);
    setPayDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed", variant: "destructive" });
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getReceiptUrl = (path: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-receipts/${path}`;
  };

  // Check which fees are already paid (verified) or pending
  const getFeeStatus = (feeId: string, month?: number) => {
    const now = new Date();
    const year = now.getFullYear();
    return myPayments.find((p: any) => {
      if (p.fee_id !== feeId) return false;
      if (month !== undefined) {
        const pDate = new Date(p.date);
        return pDate.getMonth() === month && pDate.getFullYear() === year;
      }
      return true;
    });
  };

  // Determine available payment methods
  const availableMethods = [];
  if (school?.bkash_merchant) availableMethods.push({ key: "bkash", label: "bKash", color: "bg-pink-500" });
  if (school?.nagad_merchant) availableMethods.push({ key: "nagad", label: "Nagad", color: "bg-orange-500" });
  
  availableMethods.push({ key: "bank_transfer", label: "Bank Transfer", color: "bg-primary" });
  availableMethods.push({ key: "cash", label: "Cash", color: "bg-muted-foreground" });

  const pendingCount = myPayments.filter((p: any) => p.status === "pending").length;
  const verifiedCount = myPayments.filter((p: any) => p.status === "verified").length;

  // If auth resolved but no student profile is linked, show a clear error
  if (studentFetched && !studentLoading && !student) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            My Payments
          </h1>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-destructive">Student profile not linked</p>
              <p className="text-sm text-muted-foreground">
                Your login account is not linked to any student record. Consequently, fee and payment details cannot be displayed.
              </p>
              <p className="text-xs text-muted-foreground pt-1">Logged in as: <span className="font-mono font-bold text-foreground">{user?.email}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Linking Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Link Your Student Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select your student profile from the list below and click <strong>&quot;Link Profile&quot;</strong>:
            </p>
            {availableUnlinked.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <Select
                    value={selectedStudentToLink || (availableUnlinked.length === 1 ? availableUnlinked[0].id : "")}
                    onValueChange={setSelectedStudentToLink}
                  >
                    <SelectTrigger className="w-full sm:w-96">
                      <SelectValue placeholder="Select student profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnlinked.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.student_name} — {s.classes?.class_name || "No Class"} {s.roll ? `(Roll: ${s.roll})` : ""} {s.student_id ? `[ID: ${s.student_id}]` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleLinkProfile}
                    disabled={isLinkingProfile || (!selectedStudentToLink && availableUnlinked.length !== 1)}
                    className="gap-2 font-medium"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {isLinkingProfile ? "Linking..." : "Link Profile"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                Or link directly using your Student ID, Roll Number, or Phone:
              </p>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Input
                  placeholder="Enter Student ID / Roll / Phone"
                  value={manualLookupValue}
                  onChange={(e) => {
                    setManualLookupValue(e.target.value);
                    setManualLookupError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualLinkByInput();
                  }}
                  className="w-full sm:w-80"
                />
                <Button
                  onClick={handleManualLinkByInput}
                  disabled={isLinkingProfile || !manualLookupValue.trim()}
                  variant="secondary"
                  className="gap-2 font-medium"
                >
                  <LinkIcon className="h-4 w-4" />
                  {isLinkingProfile ? "Searching & Linking..." : "Find & Link"}
                </Button>
              </div>
              {manualLookupError && (
                <p className="text-xs text-destructive">{manualLookupError}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          My Payments
        </h1>
        <p className="page-description">
          View your fee schedule, make payments, and track payment status.
        </p>
      </div>

      <StudentAccountsLedger student={student} />




      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Fees</p>
              <p className="text-lg font-bold font-heading">{fees.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold font-heading text-warning">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className="text-lg font-bold font-heading text-success">{verifiedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-bold font-heading">
                ৳{myPayments.filter((p: any) => p.status === "verified").reduce((a: number, p: any) => a + Number(p.amount), 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Info Card */}
      {(school?.bkash_merchant || school?.nagad_merchant) && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-card to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              School Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {school?.bkash_merchant && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/5 border border-pink-500/20">
                  <div className="h-10 w-10 rounded-lg bg-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">bK</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">bKash Merchant</p>
                    <p className="text-sm font-bold text-foreground">{school.bkash_merchant}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(school.bkash_merchant!, "bkash")}
                    className="p-1.5 rounded-lg hover:bg-pink-500/10 transition-colors shrink-0"
                  >
                    {copiedField === "bkash" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              )}
              {school?.nagad_merchant && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                  <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">N</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Nagad Merchant</p>
                    <p className="text-sm font-bold text-foreground">{school.nagad_merchant}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(school.nagad_merchant!, "nagad")}
                    className="p-1.5 rounded-lg hover:bg-orange-500/10 transition-colors shrink-0"
                  >
                    {copiedField === "nagad" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              )}
              {school?.school_phone && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">School Phone</p>
                    <p className="text-sm font-bold text-foreground">{school.school_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Schedule */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Banknote className="h-5 w-5 text-accent" />
            Fee Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <div className="text-center py-10">
              <Banknote className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No fees have been assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fees.map((fee: any) => {
                const isMonthly = fee.frequency === "monthly";
                const existingPayment = !isMonthly ? getFeeStatus(fee.id) : null;
                const isPaid = existingPayment?.status === "verified";
                const isPending = existingPayment?.status === "pending";

                return (
                  <div
                    key={fee.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isPaid ? "border-success/30 bg-success/5" : isPending ? "border-warning/30 bg-warning/5" : "border-border hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground">{fee.fee_type}</h4>
                          {isMonthly && <Badge variant="secondary" className="text-xs">Monthly</Badge>}
                          {fee.classes?.class_name && <Badge variant="outline" className="text-xs">{fee.classes.class_name}</Badge>}
                          {!fee.class_id && <Badge variant="outline" className="text-xs">All Classes</Badge>}
                        </div>
                        {fee.description && <p className="text-xs text-muted-foreground mt-1">{fee.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold font-heading text-foreground">৳{Number(fee.amount).toLocaleString()}</p>
                        {isMonthly && <p className="text-xs text-muted-foreground">/month</p>}
                      </div>
                    </div>

                    {/* For monthly fees show month grid */}
                    {isMonthly && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {MONTH_NAMES.map((month, idx) => {
                          const mp = getFeeStatus(fee.id, idx);
                          const paid = mp?.status === "verified";
                          const pending = mp?.status === "pending";
                          const rejected = mp?.status === "rejected";
                          return (
                            <button
                              key={idx}
                              disabled={paid || pending}
                              onClick={() => openPayDialog({ ...fee, _monthIndex: idx, _monthLabel: month })}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                paid
                                  ? "bg-success/10 text-success cursor-default"
                                  : pending
                                  ? "bg-warning/10 text-warning cursor-default"
                                  : rejected
                                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                  : "bg-muted hover:bg-primary/10 hover:text-primary cursor-pointer"
                              }`}
                              title={paid ? "Paid" : pending ? "Pending verification" : `Pay for ${month}`}
                            >
                              {month.slice(0, 3)}
                              {paid && " ✓"}
                              {pending && " ⏳"}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* For one-time fees show pay button */}
                    {!isMonthly && (
                      <div className="mt-3">
                        {isPaid ? (
                          <Badge className="bg-success/10 text-success border-success/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Paid & Verified
                          </Badge>
                        ) : isPending ? (
                          <Badge className="bg-warning/10 text-warning border-warning/30">
                            <Clock className="h-3 w-3 mr-1" /> Pending Verification
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => openPayDialog(fee)} className="h-8">
                            <Send className="h-3.5 w-3.5 mr-1.5" /> Pay Now
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              Payment History ({myPayments.length})
            </CardTitle>
            {showHistory ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {myPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payment records yet.</p>
            ) : (
              <div className="space-y-2">
                {myPayments.map((p: any) => {
                  const statusIcon = p.status === "verified"
                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : p.status === "rejected"
                    ? <XCircle className="h-4 w-4 text-destructive" />
                    : <Clock className="h-4 w-4 text-warning" />;
                  const statusBg = p.status === "verified"
                    ? "border-success/20 bg-success/5"
                    : p.status === "rejected"
                    ? "border-destructive/20 bg-destructive/5"
                    : "border-warning/20 bg-warning/5";
                  return (
                    <div key={p.id} className={`p-3 rounded-lg border ${statusBg}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {statusIcon}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{p.fee_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(p.date), "dd MMM yyyy")} • {p.payment_method?.replace("_", " ")}
                              {p.transaction_id && ` • TxID: ${p.transaction_id}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">৳{Number(p.amount).toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs capitalize">{p.status}</Badge>
                        </div>
                      </div>
                      {p.receipt_image && (
                        <div className="mt-2 ml-7">
                          <a href={getReceiptUrl(p.receipt_image)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                            <Image className="h-3.5 w-3.5" /> View Receipt Screenshot
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Submit Payment
            </DialogTitle>
          </DialogHeader>

          {selectedFee && (
            <div className="space-y-5">
              {/* Fee Summary */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-foreground">{selectedFee.fee_type}</p>
                    {selectedFee._monthLabel && (
                      <p className="text-xs text-primary font-medium mt-0.5">Month: {selectedFee._monthLabel}</p>
                    )}
                  </div>
                  <p className="text-xl font-bold font-heading text-primary">৳{Number(selectedFee.amount).toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableMethods.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        paymentMethod === m.key
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/30 text-muted-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show merchant details for selected method */}
              {paymentMethod === "bkash" && school?.bkash_merchant && (
                <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Send money to this bKash number:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground flex-1">{school.bkash_merchant}</p>
                    <button
                      onClick={() => copyToClipboard(school.bkash_merchant!, "dialog-bkash")}
                      className="p-1.5 rounded-lg hover:bg-pink-500/10"
                    >
                      {copiedField === "dialog-bkash" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              )}
              {paymentMethod === "nagad" && school?.nagad_merchant && (
                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Send money to this Nagad number:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground flex-1">{school.nagad_merchant}</p>
                    <button
                      onClick={() => copyToClipboard(school.nagad_merchant!, "dialog-nagad")}
                      className="p-1.5 rounded-lg hover:bg-orange-500/10"
                    >
                      {copiedField === "dialog-nagad" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              )}
              {paymentMethod === "bank_transfer" && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  {(school as any)?.bank_details ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-1">Bank Account Details:</p>
                      <p className="text-sm font-medium text-foreground whitespace-pre-line">{(school as any).bank_details}</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Bank details not set by school. Please contact the school office for bank details.</p>
                  )}
                </div>
              )}
              {paymentMethod === "cash" && (
                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">For cash payments, pay at school office and enter the receipt number below.</p>
                  </div>
                </div>
              )}

              {/* Transaction ID */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {paymentMethod === "cash" ? "Receipt Number" : "Transaction ID"}
                </Label>
                <Input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder={paymentMethod === "cash" ? "Enter receipt number from school" : "Enter transaction ID"}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  {paymentMethod === "cash"
                    ? "Enter the receipt number given by school office."
                    : "Enter the transaction ID after sending money."}
                </p>
              </div>

              {/* Receipt Photo Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Screenshot (Optional)</Label>
                {receiptPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img src={receiptPreview} alt="Receipt" className="w-full max-h-48 object-contain bg-muted/30" />
                    <button
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40">
                    <ImagePlus className="h-8 w-8 text-muted-foreground/40 mb-1" />
                    <span className="text-xs text-muted-foreground font-medium">Upload payment screenshot</span>
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5">JPG, PNG • Max 5MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </label>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => submitPayment.mutate()}
              disabled={!transactionId.trim() || submitPayment.isPending || uploading}
            >
              {uploading ? "Uploading..." : submitPayment.isPending ? "Submitting..." : "Submit Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentPaymentPage;
