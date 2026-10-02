import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getBearerToken = (authHeader: string | null) => {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (!trimmed) return null;

  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) return bearerMatch[1].trim();

  return trimmed;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabasePublishableKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabasePublishableKey) {
      throw new Error("Missing publishable key for auth validation");
    }

    const authHeader = req.headers.get("Authorization");
    const token = getBearerToken(authHeader);

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // validate JWT explicitly (required when verify_jwt=false)
    const supabaseAuthClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuthClient.auth.getUser(token);

    if (authError || !caller) {
      console.error("JWT validation failed:", authError?.message || "no user");
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${authError?.message || "invalid token"}` }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is master_admin or school_admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", caller.id);

    const callerRoles = (roles || []).map((r: any) => r.role);
    if (!callerRoles.includes("master_admin") && !callerRoles.includes("school_admin")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, type, record_id, school_id } = await req.json();

    // For school deletion: delete all related data and auth users
    if (type === "school" && school_id) {
      const isMasterAdmin = callerRoles.includes("master_admin");
      const schoolAdminSchoolIds = (roles || [])
        .filter((r: any) => r.role === "school_admin" && r.school_id)
        .map((r: any) => r.school_id);

      if (!isMasterAdmin && !schoolAdminSchoolIds.includes(school_id)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Collect all user_ids to delete from auth
      const { data: teachers } = await supabaseAdmin
        .from("teachers").select("user_id").eq("school_id", school_id).not("user_id", "is", null);
      const { data: students } = await supabaseAdmin
        .from("students").select("user_id").eq("school_id", school_id).not("user_id", "is", null);
      const { data: staff } = await supabaseAdmin
        .from("staff").select("user_id").eq("school_id", school_id).not("user_id", "is", null);
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles").select("user_id").eq("school_id", school_id).eq("role", "school_admin");

      const userIds = new Set<string>();
      for (const t of teachers || []) if (t.user_id) userIds.add(t.user_id);
      for (const s of students || []) if (s.user_id) userIds.add(s.user_id);
      for (const st of staff || []) if (st.user_id) userIds.add(st.user_id);
      for (const ar of adminRoles || []) if (ar.user_id) userIds.add(ar.user_id);

      // Delete all related database records in correct order (child tables first)
      await supabaseAdmin.from("homework_submissions").delete().eq("school_id", school_id);
      await supabaseAdmin.from("marks").delete().eq("school_id", school_id);
      await supabaseAdmin.from("payments").delete().eq("school_id", school_id);
      await supabaseAdmin.from("attendance").delete().eq("school_id", school_id);
      await supabaseAdmin.from("teacher_attendance").delete().eq("school_id", school_id);
      await supabaseAdmin.from("staff_attendance").delete().eq("school_id", school_id);
      await supabaseAdmin.from("homework").delete().eq("school_id", school_id);
      await supabaseAdmin.from("marks").delete().eq("school_id", school_id);
      await supabaseAdmin.from("results").delete().eq("school_id", school_id);
      await supabaseAdmin.from("teacher_assignments").delete().eq("school_id", school_id);
      await supabaseAdmin.from("subject_setups").delete().eq("school_id", school_id);
      await supabaseAdmin.from("subjects").delete().eq("school_id", school_id);
      await supabaseAdmin.from("fees").delete().eq("school_id", school_id);
      await supabaseAdmin.from("notices").delete().eq("school_id", school_id);
      await supabaseAdmin.from("agreements").delete().eq("school_id", school_id);
      await supabaseAdmin.from("students").delete().eq("school_id", school_id);
      await supabaseAdmin.from("teachers").delete().eq("school_id", school_id);
      await supabaseAdmin.from("staff").delete().eq("school_id", school_id);
      await supabaseAdmin.from("sections").delete().eq("school_id", school_id);
      await supabaseAdmin.from("classes").delete().eq("school_id", school_id);

      // Delete all auth users (roles, profiles, then auth)
      const errors: string[] = [];
      for (const uid of userIds) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
        await supabaseAdmin.from("profiles").delete().eq("user_id", uid);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (error) errors.push(`${uid}: ${error.message}`);
      }

      // Finally delete school-level roles and school
      await supabaseAdmin.from("user_roles").delete().eq("school_id", school_id);

      const { error: schoolError } = await supabaseAdmin.from("schools").delete().eq("id", school_id);
      if (schoolError) throw schoolError;

      return new Response(JSON.stringify({ success: true, deleted_users: userIds.size, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For individual user deletion (teacher, student, staff)
    let targetUserId = user_id;

    if (!targetUserId && type && record_id) {
      const table = type === "teacher" ? "teachers" : type === "student" ? "students" : type === "staff" ? "staff" : null;
      if (table) {
        const { data: existingRec } = await supabaseAdmin
          .from(table)
          .select("user_id")
          .eq("id", record_id)
          .maybeSingle();
        if (existingRec?.user_id) {
          targetUserId = existingRec.user_id;
        }
      }
    }

    if (targetUserId) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
      await supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId);
      try {
        await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      } catch (authDelErr: any) {
        console.warn("Auth delete user error:", authDelErr?.message || authDelErr);
      }
    }

    // Delete the record itself and its child dependencies to avoid foreign key violations
    if (type && record_id) {
      if (type === "student") {
        await supabaseAdmin.from("marks").delete().eq("student_id", record_id);
        await supabaseAdmin.from("attendance").delete().eq("student_id", record_id);
        await supabaseAdmin.from("payments").delete().eq("student_id", record_id);
        await supabaseAdmin.from("homework_submissions").delete().eq("student_id", record_id);
        await supabaseAdmin.from("results").delete().eq("student_id", record_id);
        const { error: studentDelErr } = await supabaseAdmin.from("students").delete().eq("id", record_id);
        if (studentDelErr) {
          await supabaseAdmin.from("students").update({ is_active: false, user_id: null }).eq("id", record_id);
        }
      } else if (type === "teacher") {
        await supabaseAdmin.from("teacher_assignments").delete().eq("teacher_id", record_id);
        await supabaseAdmin.from("teacher_attendance").delete().eq("teacher_id", record_id);
        const { error: teacherDelErr } = await supabaseAdmin.from("teachers").delete().eq("id", record_id);
        if (teacherDelErr) {
          await supabaseAdmin.from("teachers").update({ is_active: false, user_id: null }).eq("id", record_id);
        }
      } else if (type === "staff") {
        await supabaseAdmin.from("staff_attendance").delete().eq("staff_id", record_id);
        const { error: staffDelErr } = await supabaseAdmin.from("staff").delete().eq("id", record_id);
        if (staffDelErr) {
          await supabaseAdmin.from("staff").update({ is_active: false, user_id: null }).eq("id", record_id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Delete error:", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
