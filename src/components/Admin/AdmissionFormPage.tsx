import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FileText, Printer, Download, CheckCircle2,
  Calendar, Layers, Scissors, School as SchoolIcon,
  HelpCircle, Settings2, UserPlus, RefreshCw, ChevronDown, ChevronUp,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BlankAdmissionFormPrintable, BlankFormConfig } from "./BlankAdmissionFormPrintable";
import { printHtmlDocument } from "@/utils/safePrint";

const currentYear = new Date().getFullYear();

const defaultBlankConfig: BlankFormConfig = {
  formType: "new",
  academicYear: String(currentYear),
  classId: "all",
  className: "",
  version: "both",
  shift: "both",
  layout: "1page",
  includeTearSlip: true,
  printDensity: "normal",
};

export default function AdmissionFormPage() {
  const { profile, schoolId } = useAuth();
  const { language } = useLanguage();
  const isBn = language === "bn";

  // Form configuration
  const [config, setConfig] = useState<BlankFormConfig>(defaultBlankConfig);
  const [zoomLevel, setZoomLevel] = useState<"fit" | "100%">("fit");
  const [showSchoolEdit, setShowSchoolEdit] = useState(false);

  // Effective school ID resolution
  const effectiveSchoolId = schoolId || (profile as any)?.school_id;

  // Fetch School Info using safe RPC and direct table fallback
  const { data: school, isLoading: isSchoolLoading } = useQuery({
    queryKey: ["school-profile-admission", effectiveSchoolId],
    queryFn: async () => {
      if (!effectiveSchoolId) return null;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_school_info_safe", {
          _school_id: effectiveSchoolId,
        });
        if (!rpcErr && rpcData && rpcData.length > 0) {
          return rpcData[0];
        }
      } catch (e) {
        console.warn("RPC get_school_info_safe error, fallback to table query", e);
      }

      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", effectiveSchoolId)
        .maybeSingle();
      if (error) {
        console.error("Direct school query error", error);
        return null;
      }
      return data;
    },
    enabled: !!effectiveSchoolId,
    staleTime: 0,
  });

  // Sync loaded school data to custom overrides initially if not yet edited
  useEffect(() => {
    if (school) {
      setConfig((prev) => ({
        ...prev,
        customSchoolName: prev.customSchoolName ?? school.school_name ?? "",
        customSchoolAddress: prev.customSchoolAddress ?? school.school_address ?? "",
        customSchoolPhone: prev.customSchoolPhone ?? school.school_phone ?? "",
        customEiin: prev.customEiin ?? school.eiin ?? "",
      }));
    }
  }, [school]);

  // Fetch Classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ["classes-admission", effectiveSchoolId],
    queryFn: async () => {
      if (!effectiveSchoolId) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name")
        .eq("school_id", effectiveSchoolId)
        .order("numeric_order", { ascending: true });
      if (error) return [];
      return data;
    },
    enabled: !!effectiveSchoolId,
  });

  // Unified Clean Print & PDF Trigger
  const triggerPrint = async (customTitle?: string) => {
    const origTitle = document.title;
    const typeLabel =
      config.formType === "re_admission" ? "ReAdmission_Form" : "Admission_Form";
    const cls = config.className
      ? config.className.replace(/[^a-zA-Z0-9_-]/g, "_")
      : "General";
    const yearLabel =
      config.academicYear && config.academicYear !== "blank"
        ? config.academicYear
        : currentYear;
    const docTitle = customTitle || `${typeLabel}_${cls}_${yearLabel}_A4`;
    document.title = docTitle;

    const printArea = document.getElementById("admission-form-printable-area");
    if (printArea) {
      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((el) => el.outerHTML)
        .join("\n");

      const isolatedHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  ${styles}
  <style>
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
      box-shadow: none !important;
    }
    *::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    @page {
      size: A4 portrait;
      margin: 3.5mm 4.5mm 3.5mm 4.5mm;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      width: 100% !important;
      overflow: visible !important;
    }
    #admission-form-printable-area {
      display: block !important;
      width: 100% !important;
      max-width: 202mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
    .a4-page-sheet {
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      width: 100% !important;
      max-width: 202mm !important;
      min-height: 280mm !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      margin: 0 auto !important;
      padding: 3mm !important;
      border: 1.5pt solid #0f172a !important;
      box-shadow: none !important;
      background-color: #ffffff !important;
    }
    .a4-page-sheet.last-sheet {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  </style>
</head>
<body style="background:#ffffff;margin:0;padding:0;">
  ${printArea.outerHTML}
</body>
</html>`;

      try {
        await printHtmlDocument({
          html: isolatedHtml,
          title: docTitle,
          printDelayMs: 300,
        });
        setTimeout(() => {
          document.title = origTitle;
        }, 1500);
        return;
      } catch (err) {
        console.warn("Isolated print fallback to window.print:", err);
      }
    }

    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1500);
  };

  // Print Handler
  const handlePrint = () => {
    triggerPrint();
  };

  // Download PDF Handler with clean descriptive title
  const handleDownloadPdf = () => {
    triggerPrint();
  };

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-0 print:pb-0">
      {/* ========================================================= */}
      {/* NO-PRINT: TOOLBAR & CONFIGURATION CONTROLS                */}
      {/* ========================================================= */}
      <div className="no-print space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0 mt-0.5">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {isBn ? "ভর্তি ও পুনঃভর্তি ফরম প্রিন্টার" : "Admission & Re-Admission Form Generator"}
                  </h1>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-xs py-0.5 font-bold">
                    {isBn ? "A4 সাইজ শতভাগ ফিট" : "100% A4 Fit"}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {isBn
                    ? "আদর্শ A4 পেজে ১ পাতায় (কাগজ সাশ্রয়ী) অথবা ২ পাতায় নিখুঁতভাবে সরাসরি প্রিন্ট বা PDF সেভ করুন।"
                    : "Print official standard blank admission forms fitted directly on standard A4 paper."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              className="gap-2 flex-1 sm:flex-none border-border shadow-sm hover:bg-muted text-xs sm:text-sm"
            >
              <Download className="h-4 w-4" />
              {isBn ? "পিডিএফ সেভ" : "Save PDF"}
            </Button>
            <Button
              onClick={handlePrint}
              className="gap-2 flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all font-semibold text-xs sm:text-sm"
            >
              <Printer className="h-4 w-4" />
              {isBn ? "A4 প্রিন্ট করুন" : "Print A4 Form"}
            </Button>
          </div>
        </div>

        {/* PRIMARY FORM TYPE SELECTOR (New Student vs Old Student Re-Admission) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConfig({ ...config, formType: "new" })}
            className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
              config.formType === "new"
                ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm"
                : "border-border bg-card hover:border-muted-foreground/30"
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                config.formType === "new"
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">
                  {isBn ? "১. নতুন শিক্ষার্থী ভর্তি ফরম" : "1. New Student Admission Form"}
                </span>
                {config.formType === "new" && (
                  <span className="text-xs bg-emerald-600 text-white font-medium px-2 py-0.5 rounded-full">
                    {isBn ? "নির্বাচিত" : "Active"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {isBn
                  ? "প্রথমবার ভর্তির জন্য: ডিজিটাল জন্ম সনদ, পিতা-মাতা পরিচিতি, পূর্ববর্তী বিদ্যালয়ের বিবরণ, চেকলিস্ট ও অঙ্গীকারনামা সহ।"
                  : "For fresh admission: Birth registration, parent details, previous school history, and documents checklist."}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setConfig({ ...config, formType: "re_admission" })}
            className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
              config.formType === "re_admission"
                ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm"
                : "border-border bg-card hover:border-muted-foreground/30"
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                config.formType === "re_admission"
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">
                  {isBn ? "২. পুরাতন শিক্ষার্থী পুনঃভর্তি ফরম" : "2. Old Student Re-Admission Form"}
                </span>
                {config.formType === "re_admission" && (
                  <span className="text-xs bg-emerald-600 text-white font-medium px-2 py-0.5 rounded-full">
                    {isBn ? "নির্বাচিত" : "Active"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {isBn
                  ? "পরবর্তী ক্লাসে উত্তীর্ণের জন্য: পূর্ববর্তী রোল ও জিপিএ, আইডি, নতুন ক্লাসে প্রমোশন ও হিসাব শাখা বকেয়া ক্লিয়ারেন্স সহ।"
                  : "For continuing students: Previous roll & GPA, student ID, new class promotion, and accounts dues clearance."}
              </p>
            </div>
          </button>
        </div>

        {/* Configuration Options Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                {isBn ? "ফরম ও পেপার কনফিগারেশন" : "Form & Paper Configuration"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {isBn ? "স্ক্রিন প্রিভিউ:" : "Screen Preview:"}
                </span>
                <Button
                  size="sm"
                  variant={zoomLevel === "fit" ? "secondary" : "ghost"}
                  onClick={() => setZoomLevel("fit")}
                  className="h-7 text-xs px-2.5"
                >
                  Fit
                </Button>
                <Button
                  size="sm"
                  variant={zoomLevel === "100%" ? "secondary" : "ghost"}
                  onClick={() => setZoomLevel("100%")}
                  className="h-7 text-xs px-2.5"
                >
                  100%
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              {/* Academic Year */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {isBn ? "শিক্ষাবর্ষ (Session)" : "Academic Session"}
                </Label>
                <Select
                  value={config.academicYear}
                  onValueChange={(val) => setConfig({ ...config, academicYear: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
                    <SelectItem value={String(currentYear + 1)}>{currentYear + 1}</SelectItem>
                    <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                    <SelectItem value="blank">{isBn ? "ফাঁকা রাখুন (202__)" : "Keep Blank (202__)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Class */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <SchoolIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {isBn ? "নির্দিষ্ট শ্রেণি (বা ফাঁকা)" : "Class (or Blank)"}
                </Label>
                <Select
                  value={config.classId}
                  onValueChange={(val) => {
                    const selectedCls = classes.find((c: any) => c.id === val);
                    setConfig({
                      ...config,
                      classId: val,
                      className: selectedCls ? selectedCls.class_name : "",
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isBn ? "সকল শ্রেণি (হাতে লিখবে)" : "All Classes (Handwritten)"}</SelectItem>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Page Layout Format */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  {isBn ? "ফরম লেআউট (A4 সাইজ)" : "Page Layout"}
                </Label>
                <Select
                  value={config.layout}
                  onValueChange={(val: "1page" | "2page") => setConfig({ ...config, layout: val })}
                >
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue placeholder="Layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1page">
                      {isBn ? "১ পাতা (১টি A4 পেজে সম্পূর্ণ)" : "1 Page (Single A4 Sheet)"}
                    </SelectItem>
                    <SelectItem value="2page">
                      {isBn ? "২ পাতা (২টি A4 পেজে বিস্তারিত)" : "2 Pages (Detailed & Spacious)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tear-off Slip */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                  {isBn ? "আবেদনকারী স্লিপ (রশিদ)" : "Applicant Slip"}
                </Label>
                <Select
                  value={config.includeTearSlip ? "yes" : "no"}
                  onValueChange={(val) => setConfig({ ...config, includeTearSlip: val === "yes" })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tear Slip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{isBn ? "স্লিপ সহ (With Slip)" : "With Applicant Slip"}</SelectItem>
                    <SelectItem value="no">{isBn ? "স্লিপ ছাড়া (Without Slip)" : "Without Slip"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Print Density Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {isBn ? "A4 প্রিন্ট ঘনত্ব" : "A4 Print Fit"}
                </Label>
                <Select
                  value={config.printDensity || "normal"}
                  onValueChange={(val: "compact" | "normal" | "comfortable") =>
                    setConfig({ ...config, printDensity: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Fit Density" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      {isBn ? "স্ট্যান্ডার্ড A4 (১০০% ফিট)" : "Standard (Exact A4)"}
                    </SelectItem>
                    <SelectItem value="compact">
                      {isBn ? "অতি সংকুচিত (ছোট মার্জিন)" : "Compact (Safe Fit)"}
                    </SelectItem>
                    <SelectItem value="comfortable">
                      {isBn ? "খোলামেলা (বড় ফন্ট)" : "Comfortable"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* School Header Information Customizer Toggle */}
            <div className="border border-border/80 rounded-lg p-3 bg-card/60">
              <button
                type="button"
                onClick={() => setShowSchoolEdit(!showSchoolEdit)}
                className="w-full flex items-center justify-between text-xs font-semibold text-foreground hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SchoolIcon className="h-4 w-4 text-emerald-600" />
                  <span>
                    {isBn
                      ? `প্রতিষ্ঠানের হেডার তথ্য: ${config.customSchoolName || school?.school_name || "লোড হচ্ছে..."}`
                      : `School Header: ${config.customSchoolName || school?.school_name || "Loading..."}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>{showSchoolEdit ? (isBn ? "বন্ধ করুন" : "Close") : (isBn ? "হেডার তথ্য পরিবর্তন" : "Edit Header")}</span>
                  {showSchoolEdit ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </div>
              </button>

              {showSchoolEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">{isBn ? "প্রতিষ্ঠানের নাম" : "School Name"}</Label>
                    <Input
                      value={config.customSchoolName ?? ""}
                      onChange={(e) => setConfig({ ...config, customSchoolName: e.target.value })}
                      placeholder="বিদ্যালয়ের নাম"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">{isBn ? "ঠিকানা" : "Address"}</Label>
                    <Input
                      value={config.customSchoolAddress ?? ""}
                      onChange={(e) => setConfig({ ...config, customSchoolAddress: e.target.value })}
                      placeholder="ঠিকানা"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">{isBn ? "মোবাইল/ফোন" : "Phone"}</Label>
                    <Input
                      value={config.customSchoolPhone ?? ""}
                      onChange={(e) => setConfig({ ...config, customSchoolPhone: e.target.value })}
                      placeholder="মোবাইল নম্বর"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">{isBn ? "EIIN নম্বর" : "EIIN"}</Label>
                    <Input
                      value={config.customEiin ?? ""}
                      onChange={(e) => setConfig({ ...config, customEiin: e.target.value })}
                      placeholder="EIIN"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Print Instruction & Tips Box */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-800 dark:text-slate-200">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                    {isBn ? "A4 পেজে শতভাগ নিখুঁত প্রিন্ট করার নির্দেশনাবলী:" : "Guidelines for Exact A4 Page Print:"}
                  </span>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {isBn
                      ? "ব্রাউজার প্রিন্ট ডায়ালগে Paper Size: 'A4', Margins: 'Default' অথবা 'None' রাখুন এবং Headers & Footers আনচেক (Uncheck) রাখুন।"
                      : "In the browser print dialog, select Paper Size: 'A4', Margins: 'Default' or 'None', and uncheck Headers & Footers."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {config.layout === "1page"
                    ? (isBn ? "১টি A4 পাতায় ফিট" : "Guaranteed 1 A4 Page")
                    : (isBn ? "২টি A4 পাতায় ফিট" : "Guaranteed 2 A4 Pages")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* PRINTABLE A4 PREVIEW CONTAINER                            */}
      {/* ========================================================= */}
      <div className="w-full overflow-x-auto pb-8 scrollbar-thin">
        <div
          className={`mx-auto transition-all ${
            zoomLevel === "fit" ? "max-w-[215mm] min-w-[320px]" : "w-max min-w-[215mm]"
          }`}
        >
          <BlankAdmissionFormPrintable
            school={school}
            config={config}
            isBn={isBn}
          />
        </div>
      </div>

      {/* PRINT MEDIA QUERY STYLES (PRECISE A4 DISCIPLINE) */}
      <style>{`
        @media print {
          /* 1. Global Print Reset: suppress scrollbars, shadows, and browser decorations */
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }

          @page {
            size: A4 portrait;
            margin: 3.5mm 4.5mm 3.5mm 4.5mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }

          /* 2. Hide all non-printable application shell, navigation, header, sidebar, buttons */
          .no-print, nav, header, aside, .sidebar, button, footer, [role="navigation"] {
            display: none !important;
          }

          /* 3. Reset application layout flex wrappers that cause scrollbars or clipped bounds */
          #root,
          .flex.h-screen,
          .flex-1,
          main,
          [class*="overflow-"] {
            display: block !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* 4. Target printable area */
          #admission-form-printable-area {
            display: block !important;
            width: 100% !important;
            max-width: 202mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          /* 5. A4 Page Sheet configuration */
          .a4-page-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100% !important;
            max-width: 202mm !important;
            min-height: 280mm !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            page-break-before: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            padding: 3mm !important;
            border: 1.5pt solid #0f172a !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
          }

          .a4-page-sheet.last-sheet {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
