import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import LanguageSwitcher from "@/components/Common/LanguageSwitcher";
import shikkhaLogo from "@/assets/shikkha-logo.png";

type LoginMode = "general" | "master" | "admin";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<LoginMode>("general");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { appName, appNameBn, appTagline, appLogoUrl, isLoading: settingsLoading } = useAppSettings();

  // Always show static logo immediately, switch to DB logo only when preloaded
  const [resolvedLogo, setResolvedLogo] = useState(shikkhaLogo);

  useEffect(() => {
    if (appLogoUrl && !settingsLoading) {
      const img = new Image();
      img.onload = () => setResolvedLogo(appLogoUrl);
      img.src = appLogoUrl;
    }
  }, [appLogoUrl, settingsLoading]);

  const toggleMode = (mode: LoginMode) => {
    setLoginMode(prev => prev === mode ? "general" : mode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: t("auth.fillAllFields"), variant: "destructive" });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: password.trim() });
    
    if (error) {
      setIsLoading(false);
      toast({
        title: t("auth.loginFailed"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data.user) {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role, school_id")
        .eq("user_id", data.user.id);

      const userRoles = rolesData?.map(r => r.role) || [];
      const isMaster = userRoles.includes("master_admin");
      const isAdmin = userRoles.includes("school_admin");
      const userEmail = (data.user.email || cleanEmail).toLowerCase().trim();
      const emailPrefix = userEmail.split("@")[0];

      // 1. MASTER ADMIN CHECKS
      if (isMaster) {
        if (loginMode !== "master") {
          await supabase.auth.signOut();
          setIsLoading(false);
          toast({
            title: t("auth.accessDenied"),
            description: "Please switch to Master Login mode to login as Master Admin.",
            variant: "destructive",
          });
          return;
        }
        setIsLoading(false);
        navigate("/");
        return;
      }

      if (loginMode === "master" && !isMaster) {
        await supabase.auth.signOut();
        setIsLoading(false);
        toast({
          title: t("auth.accessDenied"),
          description: t("auth.notMasterAdmin"),
          variant: "destructive",
        });
        return;
      }

      // 2. SCHOOL ADMIN CHECKS
      if (isAdmin) {
        if (loginMode !== "admin") {
          await supabase.auth.signOut();
          setIsLoading(false);
          toast({
            title: t("auth.accessDenied"),
            description: "Please switch to Admin Login mode to login as School Admin.",
            variant: "destructive",
          });
          return;
        }

        const adminSchoolId = rolesData?.find(r => r.role === "school_admin")?.school_id;
        if (adminSchoolId) {
          const { data: schoolData } = await supabase
            .from("schools")
            .select("is_active, deleted_at")
            .eq("id", adminSchoolId)
            .maybeSingle();

          if (!schoolData || schoolData.deleted_at || !schoolData.is_active) {
            await supabase.auth.signOut();
            setIsLoading(false);
            toast({
              title: "Account Inactive",
              description: "This school or administrator account has been deleted or suspended.",
              variant: "destructive",
            });
            return;
          }
        }

        setIsLoading(false);
        navigate("/");
        return;
      }

      if (loginMode === "admin" && !isAdmin) {
        await supabase.auth.signOut();
        setIsLoading(false);
        toast({
          title: t("auth.accessDenied"),
          description: "This account is not a School Admin.",
          variant: "destructive",
        });
        return;
      }

      // 3. GENERAL LOGIN: Check for active Student, Teacher, or Staff
      // Query active student record
      const { data: studentRecord } = await supabase
        .from("students")
        .select("id, school_id, is_active, user_id")
        .or(`user_id.eq.${data.user.id},student_id.eq.${emailPrefix},student_id.eq.${cleanEmail},phone.eq.${emailPrefix}`)
        .eq("is_active", true)
        .maybeSingle();

      // Query active teacher record
      const { data: teacherRecord } = await supabase
        .from("teachers")
        .select("id, school_id, is_active, user_id")
        .or(`user_id.eq.${data.user.id},email.ilike.${cleanEmail},teacher_id_number.eq.${emailPrefix},phone.eq.${emailPrefix}`)
        .eq("is_active", true)
        .maybeSingle();

      // Query active staff record
      const { data: staffRecord } = await supabase
        .from("staff")
        .select("id, school_id, is_active, user_id")
        .or(`user_id.eq.${data.user.id},email.ilike.${cleanEmail},staff_id_number.eq.${emailPrefix},phone.eq.${emailPrefix}`)
        .eq("is_active", true)
        .maybeSingle();

      // If user had a student role but student record is not directly matched yet:
      // Allow them into the session so they can link their profile in the student portal
      if (userRoles.includes("student") && !studentRecord) {
        console.info("Student record not yet linked, proceeding to portal for self-linking.");
      }

      // If user had a teacher role but teacher record is gone/inactive => DELETED!
      if (userRoles.includes("teacher") && !teacherRecord) {
        await supabase.auth.signOut();
        setIsLoading(false);
        toast({
          title: "Account Deleted",
          description: "This teacher account has been deleted or deactivated. You cannot log in.",
          variant: "destructive",
        });
        return;
      }

      // If user had a staff role but staff record is gone/inactive => DELETED!
      if (userRoles.includes("staff") && !staffRecord) {
        await supabase.auth.signOut();
        setIsLoading(false);
        toast({
          title: "Account Deleted",
          description: "This staff account has been deleted or deactivated. You cannot log in.",
          variant: "destructive",
        });
        return;
      }

      // If user has NO active student, teacher, or staff record found at all:
      if (!studentRecord && !teacherRecord && !staffRecord) {
        if (userRoles.includes("student") || userRoles.length === 0) {
          console.info("Unlinked user entering portal to link record.");
        } else {
          await supabase.auth.signOut();
          setIsLoading(false);
          toast({
            title: "Account Not Found",
            description: "This account has been deleted or is not registered. You cannot log in.",
            variant: "destructive",
          });
          return;
        }
      }

      // Check whether their associated school is active
      const memberSchoolId = studentRecord?.school_id || teacherRecord?.school_id || staffRecord?.school_id;
      if (memberSchoolId) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("is_active, deleted_at")
          .eq("id", memberSchoolId)
          .maybeSingle();

        if (!schoolData || schoolData.deleted_at || !schoolData.is_active) {
          await supabase.auth.signOut();
          setIsLoading(false);
          toast({
            title: "School Deactivated",
            description: "Your school account has been deleted or suspended. Please contact administrator.",
            variant: "destructive",
          });
          return;
        }
      }

      // Link user_id if not yet linked
      if (studentRecord && !studentRecord.user_id) {
        await supabase.from("students").update({ user_id: data.user.id }).eq("id", studentRecord.id);
      } else if (teacherRecord && !teacherRecord.user_id) {
        await supabase.from("teachers").update({ user_id: data.user.id }).eq("id", teacherRecord.id);
      } else if (staffRecord && !staffRecord.user_id) {
        await supabase.from("staff").update({ user_id: data.user.id }).eq("id", staffRecord.id);
      }
    }

    setIsLoading(false);
    navigate("/");
  };

  const getEmailLabel = () => {
    if (loginMode === "master") return "Master Admin Email";
    if (loginMode === "admin") return "School Admin Email";
    return t("auth.email");
  };

  const getEmailPlaceholder = () => {
    if (loginMode === "master") return "Enter master admin email";
    if (loginMode === "admin") return "Enter school admin email";
    return t("auth.enterEmail");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <button
          onClick={() => toggleMode("admin")}
          className={`p-2 border rounded-lg transition-all duration-200 ${
            loginMode === "admin"
              ? "text-blue-600 border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700"
              : "text-muted-foreground hover:text-primary border-border hover:border-primary/30"
          }`}
          title="School Admin Login"
        >
          <UserCog className="h-4 w-4" />
        </button>
        <button
          onClick={() => toggleMode("master")}
          className={`p-2 border rounded-lg transition-all duration-200 ${
            loginMode === "master"
              ? "text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700"
              : "text-muted-foreground hover:text-primary border-border hover:border-primary/30"
          }`}
          title={t("auth.masterAdminLogin")}
        >
          <ShieldCheck className="h-4 w-4" />
        </button>
      </div>

      <div className="w-full max-w-md animate-fade-in border border-border rounded-2xl p-8 bg-card shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <img src={resolvedLogo} alt={appName} className="h-28 w-28 mb-3 border-2 border-border rounded-2xl p-2 object-contain bg-white shadow-xs" onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }} />
          <h1 className="text-2xl font-extrabold font-heading tracking-tight text-center">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              {appName}
            </span>
            {appNameBn && appNameBn.trim() && appNameBn.trim().toLowerCase() !== (appName || "").trim().toLowerCase() && (
              <span className="text-muted-foreground text-base font-medium ml-1.5">({appNameBn})</span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase font-medium text-center">{appTagline}</p>
        </div>

        {loginMode === "master" && (
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Master Admin Mode — Only platform owners can access.
            </p>
          </div>
        )}

        {loginMode === "admin" && (
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              School Admin Mode — Only school administrators can access.
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{getEmailLabel()}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={getEmailPlaceholder()}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                className="pl-10 h-11 bg-secondary/50 border-border focus:border-primary text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{t("auth.password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.enterPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pl-10 pr-10 h-11 bg-secondary/50 border-border focus:border-primary text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {loginMode === "general" && (
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className={`w-full h-11 text-sm font-semibold shadow-md ${
              loginMode === "master"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : loginMode === "admin"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "login-btn"
            }`}
          >
            {loginMode === "master" ? (
              <><ShieldCheck className="h-4 w-4 mr-2" /> {isLoading ? "Verifying..." : "Master Admin Login"}</>
            ) : loginMode === "admin" ? (
              <><UserCog className="h-4 w-4 mr-2" /> {isLoading ? "Verifying..." : "School Admin Login"}</>
            ) : (
              isLoading ? t("auth.signingIn") : t("auth.login")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
