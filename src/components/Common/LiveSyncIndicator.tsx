import { useState } from "react";
import { RefreshCw, Zap, CheckCircle2, WifiOff, AlertCircle } from "lucide-react";
import { useRealtime } from "@/contexts/RealtimeSyncContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

// Friendly table names in Bengali and English
const TABLE_LABELS: Record<string, { bn: string; en: string }> = {
  students: { bn: "শিক্ষার্থী তথ্য", en: "Students" },
  classes: { bn: "ক্লাস ও বিভাগ", en: "Classes & Sections" },
  sections: { bn: "শাখা / সেকশন", en: "Sections" },
  teachers: { bn: "শিক্ষক তথ্য", en: "Teachers" },
  staff: { bn: "কর্মচারী তথ্য", en: "Staff" },
  attendance: { bn: "উপস্থিতি", en: "Attendance" },
  teacher_attendance: { bn: "শিক্ষক উপস্থিতি", en: "Teacher Attendance" },
  staff_attendance: { bn: "কর্মচারী উপস্থিতি", en: "Staff Attendance" },
  marks: { bn: "পরীক্ষার নম্বর", en: "Marks Ledger" },
  results: { bn: "পরীক্ষা ও ফলাফল", en: "Exams & Results" },
  final_results: { bn: "চূড়ান্ত ফলাফল", en: "Final Results" },
  subject_setups: { bn: "বিষয় সেটআপ", en: "Subject Setup" },
  subjects: { bn: "বিষয় তালিকা", en: "Subjects" },
  homework: { bn: "হোমওয়ার্ক", en: "Homework" },
  notices: { bn: "নোটিশ বোর্ড", en: "Notices" },
  student_ledger: { bn: "শিক্ষার্থী লেজার", en: "Student Ledger" },
  receipts: { bn: "মানি রিসিট", en: "Receipts" },
  payments: { bn: "ফি পেমেন্ট", en: "Fee Payments" },
  fee_structures: { bn: "ফি কাঠামো", en: "Fee Setup" },
  financial_accounts: { bn: "ক্যাশ ও ব্যাংক হিসাব", en: "Cash & Bank Accounts" },
  income_transactions: { bn: "আয় লেনদেন", en: "Income Transactions" },
  expense_transactions: { bn: "ব্যয় লেনদেন", en: "Expense Transactions" },
  salary_payments: { bn: "বেতন প্রদান", en: "Salary Payments" },
  schools: { bn: "প্রতিষ্ঠান তথ্য", en: "School Info" },
  all: { bn: "সম্পূর্ণ ডেটাবেজ", en: "All App Data" },
};

export const LiveSyncIndicator = () => {
  const { status, lastSyncAt, lastSyncTable, lastSyncAction, syncCount, refreshAll } = useRealtime();
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getTableFriendlyName = (table: string | null) => {
    if (!table) return isBn ? "কোনো পরিবর্তন হয়নি" : "No recent events";
    const entry = TABLE_LABELS[table];
    if (entry) return isBn ? entry.bn : entry.en;
    return table;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return isBn ? "এই সেশনে নেই" : "None yet";
    return date.toLocaleTimeString(isBn ? "bn-BD" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            status === "connected"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15"
              : status === "syncing"
              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 hover:bg-sky-500/15"
              : status === "connecting"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/15"
              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
          }`}
          title={isBn ? "রিয়েলটাইম লাইভ সিঙ্ক স্ট্যাটাস" : "Realtime Live Sync Status"}
        >
          {/* Status Dot / Icon */}
          <span className="relative flex h-2 w-2">
            {status === "connected" && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </>
            )}
            {status === "syncing" && (
              <span className="animate-spin relative inline-flex rounded-full h-2 w-2 border border-sky-500 border-t-transparent" />
            )}
            {status === "connecting" && (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse" />
            )}
            {status === "offline" && (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400" />
            )}
          </span>

          <span className="hidden sm:inline font-semibold tracking-tight">
            {status === "connected" && (isBn ? "লাইভ" : "Live")}
            {status === "syncing" && (isBn ? "সিঙ্ক..." : "Syncing...")}
            {status === "connecting" && (isBn ? "সংযোগ..." : "Connecting...")}
            {status === "offline" && (isBn ? "অফলাইন" : "Offline")}
          </span>

          <Zap className={`h-3 w-3 ${status === "connected" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-4 space-y-3 text-left">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold leading-none">
                {isBn ? "রিয়েলটাইম লাইভ সিঙ্ক" : "Realtime Live Sync"}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isBn ? "সক্রিয় স্বয়ংক্রিয় সিঙ্ক্রোনাইজেশন" : "Active automatic synchronization"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              status === "connected"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
                : status === "syncing"
                ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300"
            }
          >
            {status === "connected" && (isBn ? "অনলাইন" : "Connected")}
            {status === "syncing" && (isBn ? "সিঙ্ক হচ্ছে" : "Syncing")}
            {status === "connecting" && (isBn ? "সংযোগ হচ্ছে" : "Connecting")}
            {status === "offline" && (isBn ? "সংযোগ বিচ্ছিন্ন" : "Offline")}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {isBn
            ? "পুরো অ্যাপের যে কোনো জায়গায় শিক্ষার্থী, শিক্ষক, ক্লাস, হাজিরা, নম্বর, ফি বা নোটিশ যোগ অথবা পরিবর্তন হলে পেজ রিফ্রেশ ছাড়াই সাথে সাথে আপডেট হবে।"
            : "Any change across students, classes, attendance, marks, fees, or notices automatically syncs in real time without refreshing."}
        </p>

        <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{isBn ? "সর্বশেষ আপডেট:" : "Last Sync:"}</span>
            <span className="font-medium text-foreground">{formatTime(lastSyncAt)}</span>
          </div>

          {lastSyncTable && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{isBn ? "আপডেট হওয়া তথ্য:" : "Updated Table:"}</span>
              <span className="font-semibold text-primary">
                {getTableFriendlyName(lastSyncTable)}
                {lastSyncAction && <span className="ml-1 text-[10px] text-muted-foreground">({lastSyncAction})</span>}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{isBn ? "মোট ইভেন্ট সিঙ্ক:" : "Events Synced:"}</span>
            <span className="font-medium text-foreground">{syncCount}</span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {status === "connected" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : status === "offline" ? (
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span>{status === "connected" ? (isBn ? "সার্ভারের সাথে সংযুক্ত" : "Subscribed to live events") : (isBn ? "সংযোগ পরীক্ষা করা হচ্ছে" : "Checking connection")}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 px-2.5 shrink-0"
            disabled={isRefreshing}
            onClick={handleManualRefresh}
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isBn ? "রিফ্রেশ" : "Refresh"}</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
