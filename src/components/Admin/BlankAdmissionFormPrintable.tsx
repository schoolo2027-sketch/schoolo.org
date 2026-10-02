import React from "react";
import { User, Scissors, Check, Building2 } from "lucide-react";

export interface BlankFormConfig {
  formType: "new" | "re_admission";
  academicYear: string;
  classId: string;
  className: string;
  version: "both" | "bangla" | "english";
  shift: "both" | "morning" | "day";
  layout: "1page" | "2page";
  includeTearSlip: boolean;
  printDensity?: "compact" | "normal" | "comfortable";
  // Optional custom overrides
  customSchoolName?: string;
  customSchoolAddress?: string;
  customSchoolPhone?: string;
  customEiin?: string;
}

interface BlankAdmissionFormPrintableProps {
  school: any;
  config: BlankFormConfig;
  isBn: boolean;
}

import { resolveSchoolLogoUrl } from "@/utils/printImageUtils";

const getSchoolLogoUrl = (logo: string | null): string => {
  return resolveSchoolLogoUrl(logo);
};

export const BlankAdmissionFormPrintable: React.FC<BlankAdmissionFormPrintableProps> = ({
  school,
  config,
}) => {
  const isOnePage = config.layout === "1page";
  const isReAdmission = config.formType === "re_admission";

  const schoolName =
    config.customSchoolName?.trim() ||
    school?.school_name ||
    "বিদ্যালয়ের নাম (School Name)";

  const schoolAddress =
    config.customSchoolAddress !== undefined
      ? config.customSchoolAddress
      : school?.school_address || "";

  const schoolPhone =
    config.customSchoolPhone !== undefined
      ? config.customSchoolPhone
      : school?.school_phone || "";

  const schoolEmail = school?.school_email || "";
  const eiin =
    config.customEiin !== undefined ? config.customEiin : school?.eiin || "";

  const sessionYear =
    config.academicYear && config.academicYear !== "blank"
      ? config.academicYear
      : "202____";

  // Density classes for print scaling
  const density = config.printDensity || "normal";
  const textScaleClass =
    density === "compact"
      ? "text-[9px] leading-tight"
      : density === "comfortable"
      ? "text-[10.5px] leading-snug"
      : "text-[9.5px] leading-snug";

  // School Header
  const renderSchoolHeader = (isPage2 = false) => {
    if (isPage2) {
      return (
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1.5 mb-2">
          <div className="flex items-center gap-2">
            {school?.school_logo ? (
              <img
                src={getSchoolLogoUrl(school.school_logo)}
                alt={schoolName}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className="w-7 h-7 rounded-full border border-slate-800 flex items-center justify-center bg-slate-100">
                <Building2 className="h-4 w-4 text-slate-700" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold uppercase font-serif tracking-tight text-slate-950 leading-none">
                {schoolName}
              </h2>
              <span className="text-[9px] text-slate-700 font-medium">
                {isReAdmission ? "পুরাতন শিক্ষার্থী পুনঃভর্তি ফরম" : "শিক্ষার্থী ভর্তি ফরম"} (পৃষ্ঠা - ২) | সেশন: {sessionYear}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-semibold border border-slate-900 px-2.5 py-0.5 bg-slate-50">
            ফরম নং: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1 gap-2">
        {/* School Logo */}
        <div className="w-14 h-14 flex items-center justify-center shrink-0">
          {school?.school_logo ? (
            <img
              src={getSchoolLogoUrl(school.school_logo)}
              alt={schoolName}
              className="max-h-14 max-w-14 object-contain"
            />
          ) : (
            <div className="w-12 h-12 border-2 border-dashed border-slate-700 rounded-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 text-[7px] text-center p-0.5 font-serif leading-tight">
              <span>[প্রতিষ্ঠানের</span>
              <span>লোগো]</span>
            </div>
          )}
        </div>

        {/* School Details */}
        <div className="text-center flex-1 px-1">
          <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight font-serif text-slate-950 leading-tight">
            {schoolName}
          </h1>
          {schoolAddress && (
            <p className="text-[9.5px] text-slate-800 mt-0.5 font-medium leading-tight">
              {schoolAddress}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[8.5px] text-slate-700 mt-0.5">
            {schoolPhone && <span>মোবাইল: {schoolPhone}</span>}
            {schoolEmail && <span>ইমেইল: {schoolEmail}</span>}
            {eiin && <span className="font-bold">EIIN: {eiin}</span>}
          </div>
        </div>

        {/* Passport Photo Box (Standard 35mm x 45mm proportion) */}
        <div className="w-16 h-20 sm:w-16 sm:h-20 border border-slate-900 shrink-0 flex flex-col items-center justify-center bg-slate-50 text-center p-0.5">
          <User className="h-4 w-4 text-slate-400 mb-0.5" />
          <span className="text-[7.5px] font-bold uppercase leading-tight text-slate-800">
            ছবি লাগান
          </span>
          <span className="text-[6.5px] text-slate-500 leading-none mt-0.5">
            (Passport Photo)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div id="admission-form-printable-area" className="w-full bg-white text-slate-950 font-sans print:m-0 print:p-0">
      {/* ========================================================================= */}
      {/* PAGE 1 (A4 SHEET)                                                         */}
      {/* ========================================================================= */}
      <div
        className={`a4-page-sheet ${isOnePage ? "last-sheet" : ""} mx-auto bg-white border-[1.5pt] border-slate-900 shadow-md print:shadow-none p-2.5 sm:p-3 print:p-[3mm] box-sizing-border`}
        style={{
          width: "100%",
          maxWidth: "202mm",
          boxSizing: "border-box",
        }}
      >
        <div className="relative flex flex-col justify-between h-full">
          
          <div>
            {/* 1. SCHOOL HEADER */}
            {renderSchoolHeader(false)}

            {/* ===================================================================== */}
            {/* FORM 1: NEW STUDENT ADMISSION FORM                                     */}
            {/* ===================================================================== */}
            {!isReAdmission ? (
              <>
                {/* Form Title Banner */}
                <div className="text-center mb-1">
                  <div className="inline-block bg-slate-900 text-white font-bold text-[11px] sm:text-xs px-4 py-0.5 rounded-sm uppercase tracking-wider font-serif">
                    NEW STUDENT ADMISSION FORM / নতুন শিক্ষার্থী ভর্তি ফরম
                  </div>
                  <div className="text-[8.5px] font-semibold text-slate-700 mt-0.5">
                    (প্রথমবার ভর্তির জন্য আবেদনপত্র • স্পষ্ট অক্ষরে পূরণ করুন)
                  </div>
                </div>

                {/* Metadata Strip */}
                <div className="border border-slate-900 text-[9.5px] mb-1 bg-slate-50/80 divide-y divide-slate-900 font-medium">
                  <div className="grid grid-cols-12 divide-x divide-slate-900 p-0.5">
                    <div className="col-span-3 flex items-center gap-1 px-1">
                      <span className="font-bold">ভর্তি ফরম নং:</span>
                      <span className="border-b border-dotted border-slate-800 flex-1 h-3.5"></span>
                    </div>
                    <div className="col-span-3 px-1 flex items-center gap-1">
                      <span className="font-bold">শিক্ষাবর্ষ:</span>
                      <span className="font-bold font-mono text-slate-900">{sessionYear}</span>
                    </div>
                    <div className="col-span-3 px-1 flex items-center gap-1">
                      <span className="font-bold">ভর্তির শ্রেণি:</span>
                      <span className="font-bold text-slate-900">{config.className || "______________"}</span>
                    </div>
                    <div className="col-span-3 px-1 flex items-center gap-1">
                      <span className="font-bold">আবেদন তারিখ:</span>
                      <span className="border-b border-dotted border-slate-800 flex-1 h-3.5"></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-slate-900 p-0.5 text-[9px]">
                    <div className="col-span-4 flex items-center gap-1.5 px-1">
                      <span className="font-bold">ভার্সন:</span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> বাংলা
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> English
                      </span>
                    </div>
                    <div className="col-span-4 px-1 flex items-center gap-1.5">
                      <span className="font-bold">শিফট:</span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> প্রভাতী
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> দিবা
                      </span>
                    </div>
                    <div className="col-span-4 px-1 flex items-center gap-1">
                      <span className="font-bold">গ্রুপ:</span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> বিজ্ঞান
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> মানবিক
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> ব্যবসায়
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. STUDENT PERSONAL INFORMATION */}
                <div className="mb-1">
                  <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-900 flex justify-between items-center">
                    <span>১. শিক্ষার্থীর ব্যক্তিগত বিবরণ / 1. Student Personal Information</span>
                  </div>
                  <table className={`w-full ${textScaleClass} border border-slate-900 border-collapse`}>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="w-1/3 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>শিক্ষার্থীর নাম (English BLOCK LETTERS):</div>
                        </td>
                        <td className="w-2/3 p-0.5 px-1" colSpan={3}>
                          <div className="h-4 flex items-center border-b border-dotted border-slate-800"></div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-900">
                        <td className="w-1/3 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>শিক্ষার্থীর নাম (বাংলায়):</div>
                        </td>
                        <td className="w-2/3 p-0.5 px-1" colSpan={3}>
                          <div className="h-4 flex items-center border-b border-dotted border-slate-800"></div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-900">
                        <td className="w-1/3 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>জন্ম তারিখ ও লিঙ্গ:</div>
                        </td>
                        <td className="w-2/3 p-0.5 px-1" colSpan={3}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span>তারিখ (DD-MM-YYYY):</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">D</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">D</span>
                              <span>-</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">M</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">M</span>
                              <span>-</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">Y</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">Y</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">Y</span>
                              <span className="w-4 h-4 border border-slate-800 inline-block text-center text-[8px]">Y</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>লিঙ্গ:</span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> ছাত্র
                              </span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> ছাত্রী
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>রক্তের গ্রুপ:</span>
                              <span className="border-b border-dotted border-slate-800 inline-block w-10"></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>ধর্ম:</span>
                              <span className="border-b border-dotted border-slate-800 inline-block w-12"></span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="w-1/3 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>অনলাইন ১৭ ডিজিট জন্ম নিবন্ধন নম্বর:</div>
                          <div className="text-[7.5px] text-slate-500 font-normal">Birth Reg No (Online Verified)</div>
                        </td>
                        <td className="w-2/3 p-0.5 px-1" colSpan={3}>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 17 }).map((_, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-4 border border-slate-800 inline-block text-center"
                              ></span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. PARENTS & GUARDIAN DETAILS */}
                <div className="mb-1">
                  <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-900">
                    ২. পিতা, মাতা ও অভিভাবকের বিবরণ / 2. Parents & Guardian Details
                  </div>
                  <table className={`w-full ${textScaleClass} border border-slate-900 border-collapse`}>
                    <tbody>
                      {/* Father */}
                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পিতার নাম (বাংলা):</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পিতার নাম (English):</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পিতার NID ও পেশা:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পিতার মোবাইল নম্বর:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="flex items-center gap-0.5">
                            <span className="w-3 h-3.5 border border-slate-800 inline-flex items-center justify-center font-mono text-[8px] font-bold">0</span>
                            <span className="w-3 h-3.5 border border-slate-800 inline-flex items-center justify-center font-mono text-[8px] font-bold">1</span>
                            {Array.from({ length: 9 }).map((_, i) => (
                              <span key={i} className="w-3 h-3.5 border border-slate-800 inline-block"></span>
                            ))}
                          </div>
                        </td>
                      </tr>

                      {/* Mother */}
                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>মাতার নাম (বাংলা):</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>মাতার নাম (English):</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>মাতার NID ও পেশা:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>মাতার মোবাইল নম্বর:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="flex items-center gap-0.5">
                            <span className="w-3 h-3.5 border border-slate-800 inline-flex items-center justify-center font-mono text-[8px] font-bold">0</span>
                            <span className="w-3 h-3.5 border border-slate-800 inline-flex items-center justify-center font-mono text-[8px] font-bold">1</span>
                            {Array.from({ length: 9 }).map((_, i) => (
                              <span key={i} className="w-3 h-3.5 border border-slate-800 inline-block"></span>
                            ))}
                          </div>
                        </td>
                      </tr>

                      {/* Legal Guardian */}
                      <tr>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>অভিভাবক (অনুপস্থিতিতে):</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="flex items-center gap-1">
                              <span>নাম:</span>
                              <span className="border-b border-dotted border-slate-800 flex-1 h-3.5"></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>সম্পর্ক:</span>
                              <span className="border-b border-dotted border-slate-800 flex-1 h-3.5"></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>মোবাইল:</span>
                              <span className="border-b border-dotted border-slate-800 flex-1 h-3.5"></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. ADDRESS & PREVIOUS SCHOOL */}
                <div className="mb-1">
                  <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-900">
                    ৩. ঠিকানা ও পূর্ববর্তী শিক্ষা প্রতিষ্ঠানের তথ্য / 3. Address & Previous School
                  </div>
                  <table className={`w-full ${textScaleClass} border border-slate-900 border-collapse`}>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>বর্তমান ঠিকানা (Present):</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="grid grid-cols-4 gap-1">
                            <div>গ্রাম/বাসা: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                            <div>ডাকঘর: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                            <div>উপজেলা: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                            <div>জেলা: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>স্থায়ী ঠিকানা (Permanent):</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="grid grid-cols-4 gap-1">
                            <div>গ্রাম: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                            <div>ডাকঘর: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                            <div>উপজেলা: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                            <div>জেলা: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পূর্ববর্তী প্রতিষ্ঠান (যদি থাকে):</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="grid grid-cols-4 gap-1">
                            <div className="col-span-2">বিদ্যালয়: <span className="border-b border-dotted border-slate-800 inline-block w-36"></span></div>
                            <div>উত্তীর্ণ শ্রেণি: <span className="border-b border-dotted border-slate-800 inline-block w-14"></span></div>
                            <div>জিপিএ/রোল: <span className="border-b border-dotted border-slate-800 inline-block w-14"></span></div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. DOCUMENTS CHECKLIST */}
                <div className="mb-1 border border-slate-900 p-1 bg-slate-50/60 text-[9px]">
                  <div className="font-bold mb-0.5 text-slate-900">দাখিলকৃত কাগজপত্র চেকলিস্ট (প্রযোজ্য ক্ষেত্রে টিক দিন):</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span>
                      <span>ডিজিটাল জন্ম সনদ ফটোকপি</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span>
                      <span>পাসপোর্ট সাইজ ছবি (৩ কপি)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span>
                      <span>পিতা-মাতার NID ফটোকপি</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span>
                      <span>ছাড়পত্র (TC) / প্রশংসাপত্র</span>
                    </div>
                  </div>
                </div>

                {/* 5. DECLARATION & SIGNATURES */}
                <div className="border border-slate-900 p-1 mb-1 bg-slate-50/30 text-[8.5px]">
                  <div className="font-bold mb-0.5">অঙ্গীকারনামা (Declaration):</div>
                  <p className="leading-tight text-slate-800">
                    আমি এই মর্মে অঙ্গীকার করছি যে, ফরমে উল্লেখিত সকল তথ্য সত্য ও সঠিক। বিদ্যালয়ের সমস্ত নিয়ম-কানুন ও শৃঙ্খলা আমি নিষ্ঠার সাথে মেনে চলব।
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-center">
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5 font-semibold">
                        শিক্ষার্থীর স্বাক্ষর ও তারিখ
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5 font-semibold">
                        পিতা / অভিভাবকের স্বাক্ষর ও তারিখ
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. FOR OFFICE USE ONLY */}
                <div className="border border-slate-900 p-1 bg-slate-100/60 text-[9px]">
                  <div className="font-extrabold uppercase mb-0.5 flex items-center justify-between border-b border-slate-900 pb-0.2">
                    <span>অফিস ব্যবহারের জন্য (For Office Use Only)</span>
                    <span className="text-[8px] font-normal text-slate-600">ভর্তি যাচাই ও চূড়ান্ত অনুমোদন</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mb-1">
                    <div>অনুমোদিত শ্রেণি: <span className="border-b border-dotted border-slate-800 inline-block w-14"></span></div>
                    <div>শাখা: <span className="border-b border-dotted border-slate-800 inline-block w-14"></span></div>
                    <div>রোল নং: <span className="border-b border-dotted border-slate-800 inline-block w-14"></span></div>
                    <div>আইডি নং: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[8.5px]">
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5">
                        ভর্তি কমিটির স্বাক্ষর
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5">
                        হিসাব শাখা (ফি পরিশোধিত)
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5 font-bold">
                        প্রধান শিক্ষক / অধ্যক্ষের সিল ও স্বাক্ষর
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ===================================================================== */
              /* FORM 2: OLD STUDENT RE-ADMISSION FORM                                 */
              /* ===================================================================== */
              <>
                {/* Title Banner */}
                <div className="text-center mb-1">
                  <div className="inline-block bg-slate-900 text-white font-bold text-[11px] sm:text-xs px-4 py-0.5 rounded-sm uppercase tracking-wider font-serif">
                    STUDENT RE-ADMISSION FORM / পুরাতন শিক্ষার্থী পুনঃভর্তি ফরম
                  </div>
                  <div className="text-[8.5px] font-semibold text-slate-700 mt-0.5">
                    (পরবর্তী শিক্ষাবর্ষে নবায়ন ও পুনঃভর্তির আবেদনপত্র • সেশন নবায়ন)
                  </div>
                </div>

                {/* Metadata Strip */}
                <div className="border border-slate-900 text-[9.5px] mb-1.5 bg-slate-50/80 divide-y divide-slate-900 font-medium">
                  <div className="grid grid-cols-12 divide-x divide-slate-900 p-0.5">
                    <div className="col-span-3 flex items-center gap-1 px-1">
                      <span className="font-bold">পুনঃভর্তি নং:</span>
                      <span className="border-b border-dotted border-slate-800 flex-1 h-3.5"></span>
                    </div>
                    <div className="col-span-3 px-1 flex items-center gap-1">
                      <span className="font-bold">নতুন শিক্ষাবর্ষ:</span>
                      <span className="font-bold font-mono text-slate-900">{sessionYear}</span>
                    </div>
                    <div className="col-span-3 px-1 flex items-center gap-1">
                      <span className="font-bold">প্রস্তাবিত শ্রেণি:</span>
                      <span className="font-bold text-slate-900">{config.className || "______________"}</span>
                    </div>
                    <div className="col-span-3 px-1 flex items-center gap-1">
                      <span className="font-bold">তারিখ:</span>
                      <span className="border-b border-dotted border-slate-800 flex-1 h-3.5"></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-slate-900 p-0.5 text-[9px]">
                    <div className="col-span-4 flex items-center gap-1.5 px-1">
                      <span className="font-bold">মাধ্যম:</span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> বাংলা
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> English
                      </span>
                    </div>
                    <div className="col-span-4 px-1 flex items-center gap-1.5">
                      <span className="font-bold">শিফট:</span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> প্রভাতী
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> দিবা
                      </span>
                    </div>
                    <div className="col-span-4 px-1 flex items-center gap-1">
                      <span className="font-bold">গ্রুপ:</span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> বিজ্ঞান
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> মানবিক
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2.5 h-2.5 border border-slate-800 inline-block"></span> ব্যবসায়
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. PREVIOUS INSTITUTIONAL RECORD */}
                <div className="mb-1">
                  <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-900 flex items-center justify-between">
                    <span>১. শিক্ষার্থীর প্রাতিষ্ঠানিক পরিচিতি ও ফলাফল / 1. Institutional Record</span>
                    <span className="text-[8px] font-normal">পূর্বের রেকর্ড</span>
                  </div>
                  <table className={`w-full ${textScaleClass} border border-slate-900 border-collapse`}>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>শিক্ষার্থীর পূর্ণ নাম:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>শিক্ষার্থী আইডি নং (ID):</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পূর্ববর্তী শিক্ষাবর্ষ ও শ্রেণি:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900">
                          <div className="flex items-center justify-between">
                            <span>সেশন: _____</span>
                            <span>শ্রেণি: _____</span>
                          </div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পূর্ববর্তী শাখা ও রোল:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="flex items-center justify-between">
                            <span>শাখা: _____</span>
                            <span>রোল: _____</span>
                          </div>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>বার্ষিক পরীক্ষার ফলাফল:</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="grid grid-cols-4 gap-1">
                            <div>প্রাপ্ত নম্বর: <span className="border-b border-dotted border-slate-800 inline-block w-12"></span></div>
                            <div>জিপিএ (GPA): <span className="border-b border-dotted border-slate-800 inline-block w-12 font-bold"></span></div>
                            <div>মেধা স্থান: <span className="border-b border-dotted border-slate-800 inline-block w-12"></span></div>
                            <div>ফলাফল: <span className="font-semibold text-slate-900">উত্তীর্ণ (Promoted)</span></div>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>রক্তের গ্রুপ ও জন্ম নিবন্ধন:</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span>রক্তের গ্রুপ:</span>
                              <span className="border-b border-dotted border-slate-800 inline-block w-12"></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>জন্ম তারিখ:</span>
                              <span className="border-b border-dotted border-slate-800 inline-block w-20"></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>অনলাইন জন্ম নিবন্ধন নং:</span>
                              <span className="border-b border-dotted border-slate-800 inline-block w-28"></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. NEW SESSION PLACEMENT */}
                <div className="mb-1">
                  <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-900">
                    ২. নতুন সেশনে পুনঃভর্তির প্রস্তাবিত তথ্য / 2. New Session Placement
                  </div>
                  <table className={`w-full ${textScaleClass} border border-slate-900 border-collapse`}>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>যে শ্রেণিতে পুনঃভর্তি হবে:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900 font-bold">
                          {config.className || "______________"}
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>প্রস্তাবিত শাখা ও শিফট:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="flex items-center justify-between">
                            <span>শাখা: _____</span>
                            <span>শিফট: _____</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>গ্রুপ ও ৪র্থ ঐচ্ছিক বিষয়:</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span>গ্রুপ:</span>
                              <span className="border-b border-dotted border-slate-800 inline-block w-20"></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>৪র্থ বিষয় (Optional):</span>
                              <span className="border-b border-dotted border-slate-800 inline-block w-36"></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. UPDATED GUARDIAN & CONTACT */}
                <div className="mb-1">
                  <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-900">
                    ৩. অভিভাবকের হালনাগাদ তথ্য / 3. Updated Guardian & Contact Info
                  </div>
                  <table className={`w-full ${textScaleClass} border border-slate-900 border-collapse`}>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>পিতার নাম ও মোবাইল:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 border-r border-slate-900">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>মাতার নাম ও মোবাইল:</div>
                        </td>
                        <td className="w-1/4 p-0.5 px-1">
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-1/4 p-0.5 px-1 bg-slate-50 font-semibold border-r border-slate-900">
                          <div>বর্তমান যোগাযোগের ঠিকানা:</div>
                        </td>
                        <td className="w-3/4 p-0.5 px-1" colSpan={3}>
                          <div className="h-3.5 border-b border-dotted border-slate-800"></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. ACCOUNTS CLEARANCE */}
                <div className="mb-1 border border-slate-900 p-1 bg-slate-50 text-[9px]">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-0.2 mb-0.5 font-bold">
                    <span>৪. হিসাব শাখা ও বকেয়া পাওনা ক্লিয়ারেন্স (Accounts Clearance)</span>
                    <span className="text-[8px] text-slate-600 font-normal">পূর্বের বকেয়া যাচাই</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-8 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-slate-800 inline-block"></span>
                        <span>বিগত বছরের সমস্ত বেতন ও ফি পরিশোধিত (No Dues Pending)</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-slate-800 inline-block"></span>
                        <span>বকেয়া পরিশোধ সাপেক্ষে পুনঃভর্তির অনুমতি</span>
                      </span>
                    </div>
                    <div className="col-span-4 text-right border-l border-slate-800 pl-1.5">
                      <div className="h-4"></div>
                      <div className="border-t border-dotted border-slate-800 text-[8.5px] font-semibold text-center">
                        হিসাবরক্ষকের স্বাক্ষর ও সিল
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. UNDERTAKING */}
                <div className="border border-slate-900 p-1 mb-1 bg-slate-50/30 text-[8.5px]">
                  <div className="font-bold mb-0.5">অঙ্গীকারনামা (Undertaking):</div>
                  <p className="leading-tight text-slate-800">
                    আমরা অঙ্গীকার করছি যে, অত্র বিদ্যালয়ের নিয়ম-শৃঙ্খলা মেনে চলব এবং নির্ধারিত সময়ে সকল বেতন ও ফি পরিশোধ করব।
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-center">
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5 font-semibold">
                        শিক্ষার্থীর স্বাক্ষর ও তারিখ
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5 font-semibold">
                        পিতা / অভিভাবকের স্বাক্ষর ও তারিখ
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. OFFICE APPROVAL */}
                <div className="border border-slate-900 p-1 bg-slate-100/60 text-[9px]">
                  <div className="font-extrabold uppercase mb-0.5 flex items-center justify-between border-b border-slate-900 pb-0.2">
                    <span>পুনঃভর্তি চূড়ান্ত অনুমোদন ও শ্রেণি নির্ধারণ (Office Approval)</span>
                    <span className="text-[8px] font-normal text-slate-600">শ্রেণি শিক্ষক ও অধ্যক্ষ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mb-1">
                    <div>অনুমোদিত শ্রেণি: <span className="border-b border-dotted border-slate-800 inline-block w-14 font-bold">{config.className}</span></div>
                    <div>বরাদ্দ শাখা: <span className="border-b border-dotted border-slate-800 inline-block w-14"></span></div>
                    <div>নতুন রোল নং: <span className="border-b border-dotted border-slate-800 inline-block w-14 font-bold"></span></div>
                    <div>রশিদ নং: <span className="border-b border-dotted border-slate-800 inline-block w-16"></span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[8.5px]">
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5">
                        পূর্ববর্তী শ্রেণি শিক্ষক
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5">
                        নতুন শ্রেণি শিক্ষক
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-dotted border-slate-900 pt-0.5 font-bold">
                        প্রধান শিক্ষক / অধ্যক্ষের সিল
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* TEAR-OFF SLIP (PINNED AT BOTTOM OF SHEET 1) */}
          {config.includeTearSlip && (
            <div className="mt-1 pt-1 border-t-2 border-dashed border-slate-700 shrink-0">
              <div className="flex items-center justify-center gap-1 text-[8px] font-bold uppercase text-slate-600 mb-0.5">
                <Scissors className="h-2.5 w-2.5" />
                <span>
                  {isReAdmission
                    ? "এখানে কেটে শিক্ষার্থীকে দিন (পুনঃভর্তি নিশ্চিতকরণ স্লিপ - Student Copy)"
                    : "এখানে কেটে শিক্ষার্থীকে দিন (ভর্তি আবেদন প্রাপ্তিস্বীকার স্লিপ - Applicant Copy)"}
                </span>
              </div>
              <div className="border border-slate-900 p-1 bg-slate-50/60 text-[8.5px]">
                <div className="flex justify-between items-center border-b border-slate-700 pb-0.5 mb-0.5">
                  <span className="font-bold text-[10px] uppercase font-serif text-slate-950">
                    {schoolName}
                  </span>
                  <span className="font-semibold text-[8px] bg-slate-800 text-white px-1.5 py-0.2 rounded-sm">
                    {isReAdmission ? "পুনঃভর্তি নিশ্চিতকরণ রশিদ" : "ভর্তি আবেদন রসিদ স্লিপ"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <div>ফরম নং: <span className="border-b border-dotted border-slate-800 inline-block w-12"></span></div>
                  <div className="col-span-2">শিক্ষার্থীর নাম: <span className="border-b border-dotted border-slate-800 inline-block w-32"></span></div>
                  <div>শ্রেণি: <span className="border-b border-dotted border-slate-800 inline-block w-12 font-bold">{config.className}</span></div>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-0.5">
                  <div>তারিখ: <span className="border-b border-dotted border-slate-800 inline-block w-12"></span></div>
                  {isReAdmission ? (
                    <>
                      <div>নতুন রোল: <span className="border-b border-dotted border-slate-800 inline-block w-12"></span></div>
                      <div>জমা ফি: <span className="border-b border-dotted border-slate-800 inline-block w-12"></span></div>
                      <div className="text-right">গ্রহণকারীর স্বাক্ষর: <span className="border-b border-dotted border-slate-800 inline-block w-10"></span></div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2">পরীক্ষা / লটারির তারিখ: <span className="border-b border-dotted border-slate-800 inline-block w-24"></span></div>
                      <div className="text-right">গ্রহণকারীর স্বাক্ষর: <span className="border-b border-dotted border-slate-800 inline-block w-10"></span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2 (RENDERED ONLY WHEN layout === "2page")                            */}
      {/* ========================================================================= */}
      {!isOnePage && (
        <div
          className="a4-page-sheet last-sheet mx-auto bg-white border-[1.5pt] border-slate-900 shadow-md print:shadow-none p-2.5 sm:p-3 print:p-[3mm] mt-6 print:mt-0"
          style={{
            width: "100%",
            maxWidth: "202mm",
            boxSizing: "border-box",
          }}
        >
          <div className="relative flex flex-col justify-between h-full">
            
            <div>
              {/* Page 2 Header */}
              {renderSchoolHeader(true)}

              {/* Health & Medical Information */}
              <div className="mb-2">
                <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-slate-900">
                  {isReAdmission ? "৫. স্বাস্থ্য ও জরুরি যোগাযোগ বিবরণ" : "৪. স্বাস্থ্য ও জরুরি যোগাযোগ বিবরণ / Health Information"}
                </div>
                <table className="w-full text-[9.5px] border border-slate-900 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-900">
                      <td className="w-1/3 p-1 bg-slate-50 font-semibold border-r border-slate-900">
                        শারীরিক বা স্বাস্থ্যগত বিশেষ তথ্য (যদি থাকে):
                      </td>
                      <td className="w-2/3 p-1" colSpan={3}>
                        <div className="h-4 border-b border-dotted border-slate-800"></div>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="w-1/3 p-1 bg-slate-50 font-semibold border-r border-slate-900">
                        জরুরি যোগাযোগের ব্যক্তি ও মোবাইল:
                      </td>
                      <td className="w-2/3 p-1" colSpan={3}>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span>নাম:</span>
                            <span className="border-b border-dotted border-slate-800 flex-1 h-4"></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>মোবাইল:</span>
                            <span className="border-b border-dotted border-slate-800 flex-1 h-4"></span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Academic History Table */}
              <div className="mb-2">
                <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-slate-900">
                  {isReAdmission
                    ? "৬. বিগত ২ বছরের একাডেমিক ফলাফল ও রেকর্ড"
                    : "৫. পূর্ববর্তী একাডেমিক রেকর্ড / Academic Record"}
                </div>
                <table className="w-full text-[9.5px] border border-slate-900 border-collapse text-center">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-900 font-bold text-[9px]">
                      <th className="p-1 border-r border-slate-900">প্রতিষ্ঠানের নাম</th>
                      <th className="p-1 border-r border-slate-900 w-20">শ্রেণি</th>
                      <th className="p-1 border-r border-slate-900 w-20">রোল নং</th>
                      <th className="p-1 border-r border-slate-900 w-24">পাশের সন</th>
                      <th className="p-1 w-24">জিপিএ / ফল</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-900 h-6">
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1"></td>
                    </tr>
                    <tr className="border-b border-slate-900 h-6">
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1 border-r border-slate-900"></td>
                      <td className="p-1"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Co-Curricular Activities */}
              <div className="mb-2">
                <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-slate-900">
                  {isReAdmission
                    ? "৭. সহ-শিক্ষা কার্যক্রম ও দক্ষতা (টিক দিন)"
                    : "৬. সহ-শিক্ষা কার্যক্রম ও বিশেষ দক্ষতা (টিক দিন)"}
                </div>
                <div className="border border-slate-900 p-1.5 grid grid-cols-3 sm:grid-cols-6 gap-1 text-[9.5px]">
                  {["খেলাধুলা", "বিতর্ক", "চিত্রাঙ্কন", "স্কাউটিং", "সংগীত/আবৃত্তি", "কুরআন তিলাওয়াত"].map((act) => (
                    <div key={act} className="flex items-center gap-1">
                      <span className="w-3 h-3 border border-slate-800 inline-block"></span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Checklist Table */}
              <div className="mb-2">
                <div className="bg-slate-200 border-x border-t border-slate-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-slate-900">
                  {isReAdmission
                    ? "৮. পুনঃভর্তির দাখিলকৃত কাগজপত্র ও প্রমাণাদি"
                    : "৭. দাখিলকৃত কাগজপত্রের বিবরণ / Submitted Documents"}
                </div>
                <table className="w-full text-[9px] border border-slate-900 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-900 font-semibold">
                      <th className="p-1 border-r border-slate-900 text-left w-8">ক্র:</th>
                      <th className="p-1 border-r border-slate-900 text-left">কাগজপত্রের নাম</th>
                      <th className="p-1 border-r border-slate-900 w-20 text-center">সংযুক্ত (টিক)</th>
                      <th className="p-1 w-24 text-center">অফিস যাচাই</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isReAdmission
                      ? [
                          "পূর্ববর্তী বার্ষিক পরীক্ষার মার্কশিট / প্রগ্রেস রিপোর্ট",
                          "হিসাব শাখার বেতন ও সেশন ফি ক্লিয়ারেন্স রসিদ",
                          "শিক্ষার্থীর পাসপোর্ট সাইজের ১ কপি রঙিন ছবি",
                          "পিতা/মাতার সচল মোবাইল নম্বর প্রত্যয়ন",
                        ]
                      : [
                          "শিক্ষার্থীর অনলাইন ১৭ ডিজিট ডিজিটাল জন্ম নিবন্ধন সনদের ফটোকপি",
                          "সদ্য তোলা পাসপোর্ট সাইজের রঙিন ছবি (৩ কপি)",
                          "পিতা ও মাতার জাতীয় পরিচয়পত্রের (NID) সত্যায়িত ফটোকপি",
                          "পূর্ববর্তী বিদ্যালয়ের ছাড়পত্র (TC) বা প্রশংসাপত্র",
                          "পূর্ববর্তী ক্লাসের ফাইনাল পরীক্ষার মার্কশিট / গ্রেডশিট",
                        ]
                    ).map((doc, idx) => (
                      <tr key={idx} className="border-b border-slate-900">
                        <td className="p-0.5 px-1 border-r border-slate-900 text-center">{idx + 1}</td>
                        <td className="p-0.5 px-1 border-r border-slate-900">{doc}</td>
                        <td className="p-0.5 px-1 border-r border-slate-900 text-center">
                          <span className="w-3.5 h-3.5 border border-slate-800 inline-block"></span>
                        </td>
                        <td className="p-0.5 px-1 text-center text-slate-400">
                          <span className="border-b border-dotted border-slate-600 inline-block w-16"></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Instructions */}
              <div className="border border-slate-900 p-1.5 bg-slate-50/60 text-[8.5px]">
                <div className="font-bold text-slate-900 mb-0.5">
                  বিশেষ দ্রষ্টব্য ও সাধারণ নির্দেশনাবলী:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-800">
                  <li>ভর্তি ফরমের প্রতিটি কলাম স্পষ্ট ও নির্ভুলভাবে পূরণ করতে হবে।</li>
                  <li>নির্ধারিত তারিখের মধ্যে প্রয়োজনীয় কাগজপত্র ও ফিসহ ফরম জমা দিতে হবে।</li>
                  <li>ভর্তি সংক্রান্ত যেকোনো বিষয়ে কর্তৃপক্ষের সিদ্ধান্তই চূড়ান্ত বলে গণ্য হবে।</li>
                </ul>
              </div>
            </div>

            {/* Page 2 Signatures */}
            <div className="grid grid-cols-3 gap-6 mt-6 text-center text-[9.5px]">
              <div>
                <div className="border-t border-slate-900 pt-1 font-semibold">
                  আবেদনকারীর পূর্ণ স্বাক্ষর
                </div>
              </div>
              <div>
                <div className="border-t border-slate-900 pt-1 font-semibold">
                  অভিভাবকের পূর্ণ স্বাক্ষর
                </div>
              </div>
              <div>
                <div className="border-t border-slate-900 pt-1 font-bold">
                  প্রধান শিক্ষক / অধ্যক্ষের সিল ও স্বাক্ষর
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
