import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create demo school
    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .upsert({ school_name: "Demo International School", school_code: "DEMO001", school_address: "123 Education Street, Dhaka", school_phone: "+880-1700-000000", school_email: "info@demoschool.edu.bd", is_active: true }, { onConflict: "school_code" })
      .select()
      .single();
    if (schoolErr) throw schoolErr;
    const schoolId = school.id;

    // 2. Create demo users
    const demoUsers = [
      { email: "master@demo.com", password: "123456", full_name: "Super Admin", role: "master_admin" as const, needsSchool: false },
      { email: "admin@school.com", password: "123456", full_name: "School Admin", role: "school_admin" as const, needsSchool: true },
      { email: "teacher@school.com", password: "123456", full_name: "Demo Teacher", role: "teacher" as const, needsSchool: true },
      { email: "student@school.com", password: "123456", full_name: "Demo Student", role: "student" as const, needsSchool: true },
    ];

    const userIds: Record<string, string> = {};

    for (const u of demoUsers) {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      
      let userId: string;
      if (existing) {
        userId = existing.id;
      } else {
        const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.full_name },
        });
        if (userErr) throw userErr;
        userId = newUser.user.id;
      }
      userIds[u.role] = userId;

      // Upsert profile
      await supabase.from("profiles").upsert({
        user_id: userId,
        email: u.email,
        full_name: u.full_name,
        school_id: u.needsSchool ? schoolId : null,
      }, { onConflict: "user_id" });

      // Upsert role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", u.role)
        .maybeSingle();
      
      if (!existingRole) {
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: u.role,
          school_id: u.needsSchool ? schoolId : null,
        });
      }
    }

    // 3. Create classes
    const classNames = ["Class 8", "Class 9", "Class 10"];
    const classIds: string[] = [];
    for (const cn of classNames) {
      const { data: cls } = await supabase
        .from("classes")
        .upsert({ school_id: schoolId, class_name: cn, shift: "morning", version: "bangla", academic_year: 2026 }, { onConflict: "id" })
        .select()
        .single();
      // If upsert doesn't match, insert
      if (cls) {
        classIds.push(cls.id);
      } else {
        const { data: newCls } = await supabase
          .from("classes")
          .insert({ school_id: schoolId, class_name: cn, shift: "morning", version: "bangla", academic_year: 2026 })
          .select()
          .single();
        if (newCls) classIds.push(newCls.id);
      }
    }

    // If classes already exist, fetch them
    if (classIds.length === 0) {
      const { data: existingClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("school_id", schoolId)
        .in("class_name", classNames);
      existingClasses?.forEach((c: any) => classIds.push(c.id));
    }

    // 4. Create sections
    const sectionNames = ["A", "B"];
    const sectionIds: string[] = [];
    for (const cId of classIds) {
      for (const sn of sectionNames) {
        const { data: existingSec } = await supabase
          .from("sections")
          .select("id")
          .eq("school_id", schoolId)
          .eq("class_id", cId)
          .eq("section_name", sn)
          .maybeSingle();
        if (existingSec) {
          sectionIds.push(existingSec.id);
        } else {
          const { data: sec } = await supabase
            .from("sections")
            .insert({ school_id: schoolId, class_id: cId, section_name: sn })
            .select()
            .single();
          if (sec) sectionIds.push(sec.id);
        }
      }
    }

    // 5. Create teachers (10)
    const teacherData = [
      { teacher_name: "Md. Rafiqul Islam", subject: "Mathematics", designation: "Senior Teacher", phone: "+880-1711-111001", email: "rafiq@demo.com" },
      { teacher_name: "Fatema Begum", subject: "English", designation: "Assistant Teacher", phone: "+880-1711-111002", email: "fatema@demo.com" },
      { teacher_name: "Kamal Hossain", subject: "Physics", designation: "Senior Teacher", phone: "+880-1711-111003", email: "kamal@demo.com" },
      { teacher_name: "Nasreen Akter", subject: "Chemistry", designation: "Assistant Teacher", phone: "+880-1711-111004", email: "nasreen@demo.com" },
      { teacher_name: "Abdul Karim", subject: "Bengali", designation: "Head Teacher", phone: "+880-1711-111005", email: "karim@demo.com" },
      { teacher_name: "Salma Khatun", subject: "Biology", designation: "Assistant Teacher", phone: "+880-1711-111006", email: "salma@demo.com" },
      { teacher_name: "Jahangir Alam", subject: "History", designation: "Senior Teacher", phone: "+880-1711-111007", email: "jahangir@demo.com" },
      { teacher_name: "Ruksana Parvin", subject: "Geography", designation: "Assistant Teacher", phone: "+880-1711-111008", email: "ruksana@demo.com" },
      { teacher_name: "Mizanur Rahman", subject: "ICT", designation: "Assistant Teacher", phone: "+880-1711-111009", email: "mizan@demo.com" },
      { teacher_name: "Taslima Nasrin", subject: "Religion", designation: "Assistant Teacher", phone: "+880-1711-111010", email: "taslima@demo.com" },
    ];

    for (const t of teacherData) {
      const { data: existing } = await supabase
        .from("teachers")
        .select("id")
        .eq("school_id", schoolId)
        .eq("email", t.email)
        .maybeSingle();
      if (!existing) {
        await supabase.from("teachers").insert({ ...t, school_id: schoolId });
      }
    }

    // 6. Create students (50)
    const firstNames = ["Rahim", "Karim", "Fatima", "Ayesha", "Hasan", "Nusrat", "Arif", "Mina", "Sakib", "Tasnim", "Fahim", "Rima", "Jubayer", "Sadia", "Imran", "Lamia", "Tanvir", "Nabila", "Rahat", "Sumaiya", "Mahfuz", "Jannat", "Shahriar", "Tania", "Abir", "Naima", "Rifat", "Diya", "Shuvo", "Priya", "Rakib", "Meher", "Nayeem", "Faria", "Asad", "Laboni", "Zahid", "Rubi", "Saiful", "Munni", "Anik", "Sharmin", "Jayed", "Tamanna", "Oishee", "Sohel", "Keya", "Tarek", "Shapla", "Turjo"];
    const lastNames = ["Ahmed", "Khan", "Hossain", "Islam", "Rahman", "Akter", "Begum", "Uddin", "Chowdhury", "Mia"];
    const genders = ["Male", "Female"];
    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    const studentIds: string[] = [];
    
    // Check existing student count
    const { count: existingCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    if ((existingCount || 0) < 50) {
      for (let i = 0; i < 50; i++) {
        const classIdx = Math.floor(i / 17); // ~17 per class
        const sectionIdx = i % 2;
        const cId = classIds[Math.min(classIdx, classIds.length - 1)];
        const secIdx = Math.min(classIdx, classIds.length - 1) * 2 + sectionIdx;
        const sId = sectionIds[Math.min(secIdx, sectionIds.length - 1)];
        const roll = String(101 + i);

        const { data: existingStudent } = await supabase
          .from("students")
          .select("id")
          .eq("school_id", schoolId)
          .eq("roll", roll)
          .maybeSingle();

        if (!existingStudent) {
          const { data: student } = await supabase.from("students").insert({
            school_id: schoolId,
            student_name: `${firstNames[i]} ${lastNames[i % lastNames.length]}`,
            roll,
            class_id: cId,
            section_id: sId,
            gender: genders[i % 2],
            guardian_name: `Guardian of ${firstNames[i]}`,
            phone: `+880-17${String(i + 10).padStart(2, "0")}-${String(100000 + i)}`,
            date_of_birth: `${2010 + (i % 4)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
            blood_group: bloodGroups[i % bloodGroups.length],
            address: `House ${i + 1}, Road ${(i % 10) + 1}, Dhaka`,
            user_id: i === 0 ? userIds.student : null,
          }).select().single();
          if (student) studentIds.push(student.id);
        } else {
          studentIds.push(existingStudent.id);
        }
      }
    } else {
      const { data: allStudents } = await supabase.from("students").select("id").eq("school_id", schoolId);
      allStudents?.forEach((s: any) => studentIds.push(s.id));
    }

    // 7. Create subjects
    const subjectData = [
      { subject_name: "Mathematics", subject_code: "MATH" },
      { subject_name: "English", subject_code: "ENG" },
      { subject_name: "Bengali", subject_code: "BAN" },
      { subject_name: "Physics", subject_code: "PHY" },
      { subject_name: "Chemistry", subject_code: "CHEM" },
      { subject_name: "Biology", subject_code: "BIO" },
      { subject_name: "ICT", subject_code: "ICT" },
    ];
    const subjectIds: string[] = [];
    for (const s of subjectData) {
      const { data: existing } = await supabase
        .from("subjects")
        .select("id")
        .eq("school_id", schoolId)
        .eq("subject_code", s.subject_code)
        .maybeSingle();
      if (existing) {
        subjectIds.push(existing.id);
      } else {
        const { data: sub } = await supabase
          .from("subjects")
          .insert({ ...s, school_id: schoolId, class_id: classIds[0] })
          .select()
          .single();
        if (sub) subjectIds.push(sub.id);
      }
    }

    // 8. Create attendance (last 7 days)
    const { count: attCount } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    if ((attCount || 0) < 100) {
      const attendanceRecords: any[] = [];
      const statuses: ("present" | "absent" | "late")[] = ["present", "present", "present", "present", "absent", "late"];
      for (let day = 0; day < 7; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        const dateStr = date.toISOString().split("T")[0];
        for (let si = 0; si < Math.min(studentIds.length, 20); si++) {
          attendanceRecords.push({
            school_id: schoolId,
            student_id: studentIds[si],
            class_id: classIds[0],
            date: dateStr,
            status: statuses[Math.floor(Math.random() * statuses.length)],
          });
        }
      }
      await supabase.from("attendance").insert(attendanceRecords);
    }

    // 9. Create results and marks
    const { count: resCount } = await supabase
      .from("results")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    if ((resCount || 0) < 2) {
      const exams = ["Mid-term Exam 2026", "Final Exam 2025"];
      for (const examName of exams) {
        const { data: result } = await supabase.from("results").insert({
          school_id: schoolId, exam_name: examName, class_id: classIds[0], academic_year: 2026,
        }).select().single();

        if (result) {
          const marks: any[] = [];
          for (let si = 0; si < Math.min(studentIds.length, 20); si++) {
            for (const subId of subjectIds.slice(0, 4)) {
              const obtained = Math.floor(Math.random() * 60) + 40;
              let grade = "F";
              if (obtained >= 80) grade = "A+";
              else if (obtained >= 70) grade = "A";
              else if (obtained >= 60) grade = "B";
              else if (obtained >= 50) grade = "C";
              else if (obtained >= 40) grade = "D";
              marks.push({
                school_id: schoolId, result_id: result.id, student_id: studentIds[si],
                subject_id: subId, marks_obtained: obtained, total_marks: 100, grade,
              });
            }
          }
          await supabase.from("marks").insert(marks);
        }
      }
    }

    // 10. Create homework
    const { count: hwCount } = await supabase
      .from("homework")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    if ((hwCount || 0) < 5) {
      const hwData = [
        { title: "Math Chapter 5 Exercise", description: "Complete all problems from exercise 5.1 and 5.2", class_id: classIds[0], deadline: "2026-03-15" },
        { title: "English Essay Writing", description: "Write a 500-word essay on 'My School'", class_id: classIds[0], deadline: "2026-03-12" },
        { title: "Physics Lab Report", description: "Submit lab report on Ohm's Law experiment", class_id: classIds[1], deadline: "2026-03-14" },
        { title: "Bengali Poem Analysis", description: "Analyze the poem 'Sonar Tori' by Rabindranath Tagore", class_id: classIds[1], deadline: "2026-03-18" },
        { title: "ICT Project Submission", description: "Create a simple HTML webpage about your favorite topic", class_id: classIds[2], deadline: "2026-03-20" },
      ];
      for (const hw of hwData) {
        await supabase.from("homework").insert({ ...hw, school_id: schoolId });
      }
    }

    // 11. Create notices
    const { count: noticeCount } = await supabase
      .from("notices")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    if ((noticeCount || 0) < 4) {
      const noticeData = [
        { title: "Annual Sports Day 2026", content: "We are pleased to announce that the Annual Sports Day will be held on March 25, 2026. All students must participate in at least one event. Registration forms are available at the school office.", is_broadcast: true },
        { title: "Mid-term Examination Schedule", content: "Mid-term examinations will begin from March 15, 2026. Detailed timetable has been posted on the notice board. Students must bring their admit cards.", is_broadcast: false },
        { title: "Parent-Teacher Meeting", content: "A Parent-Teacher meeting is scheduled for March 20, 2026 at 10:00 AM. All parents are requested to attend to discuss student progress.", is_broadcast: false },
        { title: "Holiday Notice - Independence Day", content: "School will remain closed on March 26, 2026 on the occasion of Independence Day. Classes will resume on March 27.", is_broadcast: true },
      ];
      for (const n of noticeData) {
        await supabase.from("notices").insert({ ...n, school_id: schoolId, posted_by: userIds.school_admin });
      }
    }

    // 12. Create fees and payments
    const { count: payCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    if ((payCount || 0) < 10) {
      // Create fee structures
      const feeTypes = [
        { fee_type: "Tuition Fee", amount: 3000, description: "Monthly tuition fee" },
        { fee_type: "Exam Fee", amount: 500, description: "Examination fee" },
        { fee_type: "Lab Fee", amount: 200, description: "Laboratory fee" },
      ];
      const feeIds: string[] = [];
      for (const f of feeTypes) {
        const { data: fee } = await supabase.from("fees").insert({ ...f, school_id: schoolId, class_id: classIds[0] }).select().single();
        if (fee) feeIds.push(fee.id);
      }

      // Create payment records
      const paymentMethods: ("bkash" | "nagad" | "cash" | "bank_transfer")[] = ["bkash", "nagad", "cash", "bank_transfer"];
      const paymentStatuses: ("pending" | "verified" | "rejected")[] = ["verified", "verified", "pending", "verified", "rejected"];
      for (let i = 0; i < Math.min(studentIds.length, 15); i++) {
        await supabase.from("payments").insert({
          school_id: schoolId,
          student_id: studentIds[i],
          fee_type: feeTypes[i % feeTypes.length].fee_type,
          amount: feeTypes[i % feeTypes.length].amount,
          payment_method: paymentMethods[i % paymentMethods.length],
          status: paymentStatuses[i % paymentStatuses.length],
          fee_id: feeIds[i % feeIds.length] || null,
          receipt_number: `RCP-2026-${String(i + 1).padStart(4, "0")}`,
          transaction_id: `TXN${Date.now()}${i}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo data seeded successfully",
        school_id: schoolId,
        demo_accounts: [
          { role: "Super Admin", email: "master@demo.com", password: "123456" },
          { role: "School Admin", email: "admin@school.com", password: "123456" },
          { role: "Teacher", email: "teacher@school.com", password: "123456" },
          { role: "Student", email: "student@school.com", password: "123456" },
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
