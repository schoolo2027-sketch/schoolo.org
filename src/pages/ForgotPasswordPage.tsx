import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/Common/LanguageSwitcher";
import shikkhaLogo from "@/assets/shikkha-logo.png";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: t("auth.enterYourEmail"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <img src={shikkhaLogo} alt="Logo" className="h-20 w-20 mb-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-2xl font-bold font-heading text-foreground">{t("auth.resetPassword")}</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {sent ? t("auth.checkEmailReset") : t("auth.resetDesc")}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("auth.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder={t("auth.enterEmail")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary" />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-semibold login-btn shadow-lg">
              {isLoading ? t("auth.sending") : t("auth.sendResetLink")}
            </Button>
          </form>
        ) : (
          <div className="text-center stat-card p-8">
            <div className="text-4xl mb-4">📧</div>
            <p className="font-medium text-foreground">{t("auth.emailSent")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("auth.checkInbox")}</p>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="font-semibold text-primary hover:underline">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
