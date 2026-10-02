import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    // App
    "app.name": "Schoolo.org",
    "app.copyright": "© 2026 Schoolo.org Platform",

    // Auth
    "auth.login": "Log In",
    "auth.signup": "Sign Up",
    "auth.logout": "Logout",
    "auth.signOut": "Sign Out",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.enterEmail": "Enter your email",
    "auth.enterPassword": "Enter your password",
    "auth.enterFullName": "Enter your full name",
    "auth.createPassword": "Create a password",
    "auth.forgotPassword": "Forgot Password?",
    "auth.resetPassword": "Reset Password",
    "auth.sendResetLink": "Send Reset Link",
    "auth.sending": "Sending...",
    "auth.signingIn": "Signing in...",
    "auth.creatingAccount": "Creating account...",
    "auth.dontHaveAccount": "Don't have an account?",
    "auth.alreadyHaveAccount": "Already have an account?",
    "auth.backToLogin": "← Back to Login",
    "auth.masterAdminAccess": "Master Admin Access 🔐",
    "auth.welcomeBack": "Good to see you again! 👋",
    "auth.masterAdminDesc": "Sign in with your master admin credentials.",
    "auth.loginDesc": "Please sign in to your account to continue.",
    "auth.masterAdminLogin": "Master Admin Login",
    "auth.fillAllFields": "Please fill in all fields",
    "auth.loginFailed": "Login failed",
    "auth.accessDenied": "Access denied",
    "auth.notMasterAdmin": "You are not a Master Admin.",
    "auth.signupFailed": "Signup failed",
    "auth.accountCreated": "Account created!",
    "auth.checkEmail": "Please check your email to verify your account.",
    "auth.createAccount": "Create Account",
    "auth.getStarted": "Get Started 🚀",
    "auth.fillDetails": "Fill in your details to create an account.",
    "auth.joinShikkha": "Join Schoolo.org",
    "auth.joinDesc": "Start managing your school smarter with our all-in-one platform.",
    "auth.passwordMinLength": "Password must be at least 6 characters",
    "auth.enterYourEmail": "Please enter your email",
    "auth.resetDesc": "Enter your email and we'll send you a reset link.",
    "auth.checkEmailReset": "Check your email for a password reset link.",
    "auth.emailSent": "Email sent!",
    "auth.checkInbox": "Please check your inbox and follow the link to reset your password.",
    "auth.error": "Error",

    // Sidebar Navigation
    "nav.dashboard": "Dashboard",
    "nav.schools": "Schools",
    "nav.students": "Students",
    "nav.admissionForm": "Admission Form",
    "nav.teachers": "Teachers",
    "nav.staff": "Staff",
    "nav.classes": "Classes",
    "nav.attendance": "Attendance",
    "nav.myAttendance": "My Attendance",
    "nav.results": "Results & Marksheet",
    "nav.myResults": "My Results",
    "nav.idCards": "ID Cards Generator",
    "nav.homework": "Homework",
    "nav.myHomework": "My Homework",
    "nav.payments": "Payments",
    "nav.myPayments": "My Payments",
    "nav.notices": "Notices",
    "nav.promotion": "Promotion",
    "nav.exam": "Exam Control",
    "nav.accounts": "Payment & Accounts",
    "nav.settings": "Settings",

    // TopBar
    "topbar.search": "Search students, teachers, classes...",
    "topbar.profile": "Profile",
    "topbar.language": "Language",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcomeBack": "Welcome back, {name}!",
    "dashboard.welcomeGeneric": "Welcome back!",
    "dashboard.overview": "Here's your school overview.",
    "dashboard.totalSchools": "Total Schools",
    "dashboard.totalStudents": "Total Students",
    "dashboard.totalTeachers": "Total Teachers",
    "dashboard.attendanceToday": "Attendance Today",
    "dashboard.feesCollected": "Fees Collected",
    "dashboard.allSchools": "📊 All Schools",
    "dashboard.selectSchool": "Select School",

    // Quick Actions
    "actions.title": "Quick Actions",
    "actions.addStudent": "Add Student",
    "actions.takeAttendance": "Take Attendance",
    "actions.recordPayment": "Record Payment",
    "actions.postNotice": "Post Notice",
    "actions.examTools": "Exam Control",
    "actions.viewResults": "Results & Marksheet",
    "actions.aiQuestionPaper": "AI Question Paper",
    "actions.viewReports": "Results & Reports",

    // Recent
    "recent.students": "Recent Students",
    "recent.notices": "Recent Notices",
    "recent.attendanceChart": "Attendance Overview",

    // 404
    "notFound.title": "404",
    "notFound.message": "Oops! Page not found",
    "notFound.returnHome": "Return to Home",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.noData": "No data found",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.date": "Date",
    "common.name": "Name",
    "common.phone": "Phone",
    "common.address": "Address",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.view": "View",
    "common.close": "Close",
    "common.submit": "Submit",
    "common.english": "English",
    "common.bangla": "বাংলা",
  },
  bn: {
    // App
    "app.name": "Schoolo.org",
    "app.copyright": "© ২০২৬ Schoolo.org প্ল্যাটফর্ম",

    // Auth
    "auth.login": "লগ ইন",
    "auth.signup": "সাইন আপ",
    "auth.logout": "লগ আউট",
    "auth.signOut": "সাইন আউট",
    "auth.email": "ইমেইল",
    "auth.password": "পাসওয়ার্ড",
    "auth.fullName": "পূর্ণ নাম",
    "auth.enterEmail": "আপনার ইমেইল লিখুন",
    "auth.enterPassword": "আপনার পাসওয়ার্ড লিখুন",
    "auth.enterFullName": "আপনার পূর্ণ নাম লিখুন",
    "auth.createPassword": "একটি পাসওয়ার্ড তৈরি করুন",
    "auth.forgotPassword": "পাসওয়ার্ড ভুলে গেছেন?",
    "auth.resetPassword": "পাসওয়ার্ড রিসেট",
    "auth.sendResetLink": "রিসেট লিংক পাঠান",
    "auth.sending": "পাঠানো হচ্ছে...",
    "auth.signingIn": "লগ ইন হচ্ছে...",
    "auth.creatingAccount": "অ্যাকাউন্ট তৈরি হচ্ছে...",
    "auth.dontHaveAccount": "অ্যাকাউন্ট নেই?",
    "auth.alreadyHaveAccount": "ইতিমধ্যে অ্যাকাউন্ট আছে?",
    "auth.backToLogin": "← লগইনে ফিরে যান",
    "auth.masterAdminAccess": "মাস্টার অ্যাডমিন এক্সেস 🔐",
    "auth.welcomeBack": "আবার স্বাগতম! 👋",
    "auth.masterAdminDesc": "আপনার মাস্টার অ্যাডমিন তথ্য দিয়ে লগইন করুন।",
    "auth.loginDesc": "চালিয়ে যেতে আপনার অ্যাকাউন্টে সাইন ইন করুন।",
    "auth.masterAdminLogin": "মাস্টার অ্যাডমিন লগইন",
    "auth.fillAllFields": "সকল তথ্য পূরণ করুন",
    "auth.loginFailed": "লগইন ব্যর্থ",
    "auth.accessDenied": "প্রবেশাধিকার নেই",
    "auth.notMasterAdmin": "আপনি মাস্টার অ্যাডমিন নন।",
    "auth.signupFailed": "সাইন আপ ব্যর্থ",
    "auth.accountCreated": "অ্যাকাউন্ট তৈরি হয়েছে!",
    "auth.checkEmail": "আপনার অ্যাকাউন্ট যাচাই করতে ইমেইল দেখুন।",
    "auth.createAccount": "অ্যাকাউন্ট তৈরি করুন",
    "auth.getStarted": "শুরু করুন 🚀",
    "auth.fillDetails": "অ্যাকাউন্ট তৈরি করতে আপনার তথ্য পূরণ করুন।",
    "auth.joinShikkha": "Schoolo.org-এ যোগ দিন",
    "auth.joinDesc": "আমাদের সম্পূর্ণ প্ল্যাটফর্মে আপনার স্কুল পরিচালনা করুন।",
    "auth.passwordMinLength": "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
    "auth.enterYourEmail": "আপনার ইমেইল লিখুন",
    "auth.resetDesc": "আপনার ইমেইল লিখুন, আমরা একটি রিসেট লিংক পাঠাব।",
    "auth.checkEmailReset": "পাসওয়ার্ড রিসেট লিংকের জন্য আপনার ইমেইল দেখুন।",
    "auth.emailSent": "ইমেইল পাঠানো হয়েছে!",
    "auth.checkInbox": "আপনার ইনবক্স দেখুন এবং পাসওয়ার্ড রিসেট করতে লিংকে ক্লিক করুন।",
    "auth.error": "ত্রুটি",

    // Sidebar Navigation
    "nav.dashboard": "ড্যাশবোর্ড",
    "nav.schools": "স্কুলসমূহ",
    "nav.students": "শিক্ষার্থীরা",
    "nav.admissionForm": "ভর্তি ফরম (Admission Form)",
    "nav.teachers": "শিক্ষকবৃন্দ",
    "nav.staff": "কর্মচারী",
    "nav.classes": "ক্লাসসমূহ",
    "nav.attendance": "উপস্থিতি",
    "nav.myAttendance": "আমার উপস্থিতি",
    "nav.results": "ফলাফল ও মার্কশিট",
    "nav.myResults": "আমার ফলাফল",
    "nav.idCards": "আইডি কার্ড জেনারেটর",
    "nav.homework": "হোমওয়ার্ক",
    "nav.myHomework": "আমার হোমওয়ার্ক",
    "nav.payments": "পেমেন্ট",
    "nav.myPayments": "আমার পেমেন্ট",
    "nav.notices": "নোটিশ",
    "nav.promotion": "পদোন্নতি",
    "nav.exam": "পরীক্ষা নিয়ন্ত্রণ (Exam Control)",
    "nav.accounts": "পেমেন্ট ও অ্যাকাউন্টস",
    "nav.settings": "সেটিংস",

    // TopBar
    "topbar.search": "শিক্ষার্থী, শিক্ষক, ক্লাস খুঁজুন...",
    "topbar.profile": "প্রোফাইল",
    "topbar.language": "ভাষা",

    // Dashboard
    "dashboard.title": "ড্যাশবোর্ড",
    "dashboard.welcomeBack": "স্বাগতম, {name}!",
    "dashboard.welcomeGeneric": "স্বাগতম!",
    "dashboard.overview": "আপনার স্কুলের সারসংক্ষেপ।",
    "dashboard.totalSchools": "মোট স্কুল",
    "dashboard.totalStudents": "মোট শিক্ষার্থী",
    "dashboard.totalTeachers": "মোট শিক্ষক",
    "dashboard.attendanceToday": "আজকের উপস্থিতি",
    "dashboard.feesCollected": "আদায়কৃত ফি",
    "dashboard.allSchools": "📊 সকল স্কুল",
    "dashboard.selectSchool": "স্কুল নির্বাচন করুন",

    // Quick Actions
    "actions.title": "দ্রুত কার্যক্রম",
    "actions.addStudent": "শিক্ষার্থী যোগ",
    "actions.takeAttendance": "উপস্থিতি নিন",
    "actions.recordPayment": "পেমেন্ট রেকর্ড",
    "actions.postNotice": "নোটিশ দিন",
    "actions.examTools": "পরীক্ষা নিয়ন্ত্রণ (Exam Control)",
    "actions.viewResults": "ফলাফল ও মার্কশিট",
    "actions.aiQuestionPaper": "AI প্রশ্নপত্র",
    "actions.viewReports": "ফলাফল ও রিপোর্ট",

    // Recent
    "recent.students": "সাম্প্রতিক শিক্ষার্থী",
    "recent.notices": "সাম্প্রতিক নোটিশ",
    "recent.attendanceChart": "উপস্থিতির চিত্র",

    // 404
    "notFound.title": "৪০৪",
    "notFound.message": "পৃষ্ঠাটি পাওয়া যায়নি",
    "notFound.returnHome": "হোমে ফিরে যান",

    // Common
    "common.save": "সংরক্ষণ",
    "common.cancel": "বাতিল",
    "common.delete": "মুছুন",
    "common.edit": "সম্পাদনা",
    "common.add": "যোগ করুন",
    "common.search": "খুঁজুন",
    "common.loading": "লোড হচ্ছে...",
    "common.noData": "কোনো তথ্য পাওয়া যায়নি",
    "common.actions": "কার্যক্রম",
    "common.status": "স্থিতি",
    "common.date": "তারিখ",
    "common.name": "নাম",
    "common.phone": "ফোন",
    "common.address": "ঠিকানা",
    "common.active": "সক্রিয়",
    "common.inactive": "নিষ্ক্রিয়",
    "common.view": "দেখুন",
    "common.close": "বন্ধ",
    "common.submit": "জমা দিন",
    "common.english": "English",
    "common.bangla": "বাংলা",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("shikkha-language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("shikkha-language", lang);
  };

  const t = (key: string) => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
