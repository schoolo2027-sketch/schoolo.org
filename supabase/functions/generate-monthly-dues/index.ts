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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get all monthly fee rules
    const { data: monthlyFees, error: feesError } = await supabase
      .from("fees")
      .select("*, classes(id, class_name, school_id)")
      .eq("frequency", "monthly");

    if (feesError) throw feesError;
    if (!monthlyFees || monthlyFees.length === 0) {
      return new Response(JSON.stringify({ message: "No monthly fees found", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCreated = 0;

    for (const fee of monthlyFees) {
      const schoolId = fee.school_id;

      // Get students for this fee's class (or all students if no class_id)
      let studentsQuery = supabase
        .from("students")
        .select("id")
        .eq("school_id", schoolId)
        .eq("is_active", true);

      if (fee.class_id) {
        studentsQuery = studentsQuery.eq("class_id", fee.class_id);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;
      if (!students || students.length === 0) continue;

      // For each student, check if a payment record for this month already exists
      for (const student of students) {
        const monthStart = `${currentMonth}-01`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

        const { data: existing } = await supabase
          .from("payments")
          .select("id")
          .eq("student_id", student.id)
          .eq("fee_id", fee.id)
          .eq("school_id", schoolId)
          .gte("date", monthStart)
          .lt("date", monthEnd)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Create pending payment for this month
        const { error: insertError } = await supabase.from("payments").insert({
          school_id: schoolId,
          student_id: student.id,
          fee_id: fee.id,
          fee_type: fee.fee_type,
          amount: fee.amount,
          status: "pending",
          payment_method: "cash",
          date: monthStart,
          receipt_number: null,
          transaction_id: null,
        });

        if (insertError) {
          console.error(`Error creating payment for student ${student.id}:`, insertError);
          continue;
        }
        totalCreated++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Monthly dues generated`, created: totalCreated, month: currentMonth }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
