import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings, Shield, Globe, Bell, PenTool, Image, Type, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageUpload from "@/components/Common/ImageUpload";

const SettingsPage = () => {
  const { schoolId, roles, profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { appName, appNameBn, appTagline, appLogoUrl, ownerSignature, ownerName, ownerDesignation, refetch: refetchAppSettings } = useAppSettings();
  const isMasterAdmin = roles.includes("master_admin");
  const isSchoolAdmin = roles.includes("school_admin");
  const isAdmin = isMasterAdmin || isSchoolAdmin;

  // Branding form
  const [brandingForm, setBrandingForm] = useState({
    app_name: "",
    app_name_bn: "",
    app_tagline: "",
    owner_name: "",
    owner_designation: "",
  });

  useEffect(() => {
    setBrandingForm({
      app_name: appName || "Schoolo.org",
      app_name_bn: appNameBn || "",
      app_tagline: appTagline || "School Management Platform",
      owner_name: ownerName || "Ridoy Khan",
      owner_designation: ownerDesignation || "Platform Authority & Founder",
    });
  }, [appName, appNameBn, appTagline, ownerName, ownerDesignation]);

  const savePlatformSetting = async (key: string, value: string | null) => {
    const { data: existing } = await supabase
      .from("platform_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("platform_settings")
        .insert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    }
  };

  const updateBrandingMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: "app_name", value: brandingForm.app_name },
        { key: "app_name_bn", value: brandingForm.app_name_bn },
        { key: "app_tagline", value: brandingForm.app_tagline },
        { key: "owner_name", value: brandingForm.owner_name },
        { key: "owner_designation", value: brandingForm.owner_designation },
      ];
      for (const item of updates) {
        await savePlatformSetting(item.key, item.value);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings-global"] });
      refetchAppSettings();
      toast({ title: "Branding and Signatory details updated successfully!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateLogoMutation = useMutation({
    mutationFn: async (url: string | null) => {
      await savePlatformSetting("app_logo_url", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings-global"] });
      refetchAppSettings();
      toast({ title: "Logo updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSignatureMutation = useMutation({
    mutationFn: async (url: string | null) => {
      await savePlatformSetting("owner_signature", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings-global"] });
      refetchAppSettings();
      toast({ title: "Owner Signature updated successfully!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // School settings (for school_admin)
  const { data: school } = useQuery({
    queryKey: ["school-settings", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data, error } = await supabase.from("schools").select("*").eq("id", schoolId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && isSchoolAdmin,
  });

  const [schoolForm, setSchoolForm] = useState({
    school_name: "", school_address: "", school_phone: "", school_email: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    bkash_merchant: "", nagad_merchant: "", mobile_banking_number: "", bank_details: "",
  });

  useEffect(() => {
    if (school) {
      setSchoolForm({
        school_name: school.school_name || "",
        school_address: school.school_address || "",
        school_phone: school.school_phone || "",
        school_email: school.school_email || "",
      });
      setPaymentForm({
        bkash_merchant: school.bkash_merchant || "",
        nagad_merchant: school.nagad_merchant || "",
        mobile_banking_number: (school as any).mobile_banking_number || "",
        bank_details: (school as any).bank_details || "",
      });
    }
  }, [school]);

  const updateSchoolMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("schools").update({
        school_name: schoolForm.school_name,
        school_address: schoolForm.school_address || null,
        school_phone: schoolForm.school_phone || null,
        school_email: schoolForm.school_email || null,
      }).eq("id", schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSchoolLogoMutation = useMutation({
    mutationFn: async (url: string | null) => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("schools").update({ school_logo: url }).eq("id", schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-settings"] });
      toast({ title: "School logo updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePrincipalSignatureMutation = useMutation({
    mutationFn: async (url: string | null) => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("schools").update({ principal_signature: url }).eq("id", schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-settings"] });
      toast({ title: "Principal signature updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Platform stats for master admin
  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [schools, activeSchools] = await Promise.all([
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return {
        totalSchools: schools.count || 0,
        activeSchools: activeSchools.count || 0,
      };
    },
    enabled: isMasterAdmin,
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
      });
    }
  }, [profile, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("profiles").update({
        full_name: profileForm.full_name || null,
      }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="page-header"><h1 className="page-title">Settings</h1></div>
        <div className="stat-card flex flex-col items-center justify-center min-h-[200px] gap-2">
          <Settings className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Only admins can manage settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          {isMasterAdmin ? "Manage platform branding, app identity, and settings." : "Manage school profile and settings."}
        </p>
      </div>

      <Tabs defaultValue={isMasterAdmin ? "branding" : "school"} className="w-full">
        <TabsList>
          {isMasterAdmin && <TabsTrigger value="branding">🎨 Branding</TabsTrigger>}
          {isMasterAdmin && <TabsTrigger value="platform">Platform</TabsTrigger>}
          {isSchoolAdmin && <TabsTrigger value="school">School Profile</TabsTrigger>}
          <TabsTrigger value="profile">My Profile</TabsTrigger>
        </TabsList>

        {/* Master Admin: Branding Settings */}
        {isMasterAdmin && (
          <TabsContent value="branding" className="space-y-6 pt-4">
            {/* App Name & Tagline */}
            <div className="stat-card max-w-2xl space-y-5">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <Type className="h-5 w-5 text-primary" /> App Name & Identity
              </h2>
              <p className="text-sm text-muted-foreground">
                Change the app name and tagline. This will reflect across the entire platform including login page, sidebar, and all pages.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">App Name (English)</label>
                  <Input
                    placeholder="e.g. Shikkha"
                    value={brandingForm.app_name}
                    onChange={(e) => setBrandingForm(p => ({ ...p, app_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">App Name (বাংলা)</label>
                  <Input
                    placeholder="e.g. শিক্ষা"
                    value={brandingForm.app_name_bn}
                    onChange={(e) => setBrandingForm(p => ({ ...p, app_name_bn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tagline</label>
                  <Input
                    placeholder="e.g. School Management System"
                    value={brandingForm.app_tagline}
                    onChange={(e) => setBrandingForm(p => ({ ...p, app_tagline: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">App Owner / Signatory Name</label>
                    <Input
                      placeholder="e.g. Ridoy Khan"
                      value={brandingForm.owner_name}
                      onChange={(e) => setBrandingForm(p => ({ ...p, owner_name: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Appears below the signature in legal agreements & official reports</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Signatory Title / Designation</label>
                    <Input
                      placeholder="e.g. Platform Director & Authorized Authority"
                      value={brandingForm.owner_designation}
                      onChange={(e) => setBrandingForm(p => ({ ...p, owner_designation: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Official authority title printed on contracts</p>
                  </div>
                </div>
              </div>
              <Button onClick={() => updateBrandingMutation.mutate()} disabled={updateBrandingMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" /> {updateBrandingMutation.isPending ? "Saving..." : "Save Branding & Authority"}
              </Button>
            </div>

            {/* App Logo */}
            <div className="stat-card max-w-2xl space-y-4">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" /> App Logo
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload a custom logo for the app. It will appear on the login page, sidebar, and throughout the platform.
              </p>
              <ImageUpload
                bucket="platform-assets"
                currentUrl={appLogoUrl}
                onUpload={(path) => updateLogoMutation.mutate(path)}
                onRemove={() => updateLogoMutation.mutate(null)}
                label="Upload App Logo"
                fallback="LOGO"
                size="lg"
              />
            </div>

            {/* Owner Signature */}
            <div className="stat-card max-w-2xl space-y-4">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" /> Owner Signature
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload your signature image. This will be used in all printed documents like agreements, reports, receipts, and marksheets.
              </p>
              <ImageUpload
                bucket="platform-assets"
                currentUrl={ownerSignature}
                onUpload={(path) => updateSignatureMutation.mutate(path)}
                onRemove={() => updateSignatureMutation.mutate(null)}
                label="Upload Signature"
                fallback="SIG"
                size="lg"
              />
            </div>
          </TabsContent>
        )}

        {/* Master Admin: Platform Settings */}
        {isMasterAdmin && (
          <TabsContent value="platform" className="space-y-6 pt-4">
            <div className="stat-card max-w-2xl space-y-4">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" /> Platform Overview
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card py-4 text-center">
                  <div className="text-2xl font-bold text-primary">{platformStats?.totalSchools ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total Schools</div>
                </div>
                <div className="stat-card py-4 text-center">
                  <div className="text-2xl font-bold text-primary">{platformStats?.activeSchools ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Active Schools</div>
                </div>
              </div>
            </div>

            <div className="stat-card max-w-2xl space-y-4">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> App Information
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">App Name</span>
                  <span className="font-semibold">{appName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-semibold">1.0.0</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="font-semibold">Production</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Admin Email</span>
                  <span className="font-semibold">{user?.email || "—"}</span>
                </div>
              </div>
            </div>

            <div className="stat-card max-w-2xl space-y-4">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Notifications
              </h2>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive email when a new school is created</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Expiry Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified before school subscriptions expire</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </TabsContent>
        )}

        {/* School Admin: School Settings */}
        {isSchoolAdmin && (
          <TabsContent value="school" className="space-y-6 pt-4">
            <div className="stat-card max-w-2xl space-y-6">
              <h2 className="font-semibold font-heading text-lg">School Profile</h2>
              <div className="space-y-4">
                {[
                  { label: "School Name", key: "school_name" as const, placeholder: "School name" },
                  { label: "Address", key: "school_address" as const, placeholder: "School address" },
                  { label: "Phone", key: "school_phone" as const, placeholder: "Phone number" },
                  { label: "Email", key: "school_email" as const, placeholder: "school@example.com" },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <Input
                      placeholder={field.placeholder}
                      value={schoolForm[field.key]}
                      onChange={(e) => setSchoolForm(p => ({ ...p, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={() => updateSchoolMutation.mutate()} disabled={updateSchoolMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" /> {updateSchoolMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {/* School Logo */}
            <div className="stat-card max-w-2xl space-y-4">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" /> School Logo
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload your school logo. It will appear on all printed documents, reports, and receipts.
              </p>
              <ImageUpload
                bucket="school-logos"
                currentUrl={school?.school_logo}
                onUpload={(path) => updateSchoolLogoMutation.mutate(path)}
                onRemove={() => updateSchoolLogoMutation.mutate(null)}
                label="Upload School Logo"
                fallback="LOGO"
                size="lg"
              />
            </div>

            {/* Principal Signature */}
            <div className="stat-card max-w-2xl space-y-4">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" /> Principal Signature
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload the principal's signature image. This will be used in printed marksheets, certificates, and official documents.
              </p>
              <ImageUpload
                bucket="signatures"
                currentUrl={school?.principal_signature}
                onUpload={(path) => updatePrincipalSignatureMutation.mutate(path)}
                onRemove={() => updatePrincipalSignatureMutation.mutate(null)}
                label="Upload Signature"
                fallback="SIG"
                size="lg"
              />
            </div>

            {/* Payment Settings */}
            <div className="stat-card max-w-2xl space-y-6">
              <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Payment Settings
              </h2>
              <p className="text-sm text-muted-foreground">
                Set your payment details here. Students will see these details when making payments.
              </p>
              <div className="space-y-4">
                {[
                  { label: "bKash Merchant Number", key: "bkash_merchant" as const, placeholder: "01XXXXXXXXX" },
                  { label: "Nagad Merchant Number", key: "nagad_merchant" as const, placeholder: "01XXXXXXXXX" },
                  { label: "Mobile Banking Number (Rocket, Upay etc.)", key: "mobile_banking_number" as const, placeholder: "01XXXXXXXXX" },
                  { label: "Bank Account Details", key: "bank_details" as const, placeholder: "Bank name, Account number, Branch etc." },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    {field.key === "bank_details" ? (
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder={field.placeholder}
                        value={paymentForm[field.key]}
                        onChange={(e) => setPaymentForm(p => ({ ...p, [field.key]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        placeholder={field.placeholder}
                        value={paymentForm[field.key]}
                        onChange={(e) => setPaymentForm(p => ({ ...p, [field.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button
                onClick={async () => {
                  if (!schoolId) return;
                  const { error } = await supabase.from("schools").update({
                    bkash_merchant: paymentForm.bkash_merchant || null,
                    nagad_merchant: paymentForm.nagad_merchant || null,
                    mobile_banking_number: paymentForm.mobile_banking_number,
                    bank_details: paymentForm.bank_details,
                  } as any).eq("id", schoolId);
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    queryClient.invalidateQueries({ queryKey: ["school-settings"] });
                    toast({ title: "Payment settings saved!" });
                  }
                }}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> Save Payment Settings
              </Button>
            </div>
          </TabsContent>
        )}

        {/* Profile Tab (all admins) */}
        <TabsContent value="profile" className="space-y-6 pt-4">
          <div className="stat-card max-w-2xl space-y-6">
            <h2 className="font-semibold font-heading text-lg">My Profile</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  placeholder="Your name"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={profileForm.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input value={roles.map(r => r.replace("_", " ").toUpperCase()).join(", ")} disabled className="bg-muted" />
              </div>
            </div>
            <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} className="gap-2">
              <Save className="h-4 w-4" /> {updateProfileMutation.isPending ? "Saving..." : "Update Profile"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
