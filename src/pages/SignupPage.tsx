import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/Common/LanguageSwitcher";
import shikkhaLogo from "@/assets/shikkha-logo.png";
import loginIllustration from "@/assets/login-illustration.png";

const SignupPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast({ title: t("auth.fillAllFields"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: t("auth.passwordMinLength"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setIsLoading(false);

    if (error) {
      toast({ title: t("auth.signupFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.accountCreated"), description: t("auth.checkEmail") });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center login-gradient">
        <div className="absolute inset-0 login-gradient" />
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center text-center px-12 animate-fade-in">
          <img src={loginIllustration} alt="Education illustration" className="w-80 h-80 object-contain mb-8 drop-shadow-lg" />
          <h2 className="text-3xl font-bold font-heading text-primary mb-3">{t("auth.joinShikkha")}</h2>
          <p className="text-muted-foreground max-w-sm text-base">{t("auth.joinDesc")}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:px-12 relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <img src={shikkhaLogo} alt="Logo" className="h-20 w-20 mb-4 lg:h-16 lg:w-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 className="text-2xl font-bold font-heading text-foreground">{t("auth.createAccount")}</h1>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-xl font-semibold font-heading text-foreground">{t("auth.getStarted")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("auth.fillDetails")}</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("auth.fullName")}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder={t("auth.enterFullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("auth.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder={t("auth.enterEmail")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("auth.password")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} placeholder={t("auth.createPassword")} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-12 bg-secondary/50 border-border focus:border-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-semibold login-btn shadow-lg">
              {isLoading ? t("auth.creatingAccount") : t("auth.signup")}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">{t("auth.login")}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
