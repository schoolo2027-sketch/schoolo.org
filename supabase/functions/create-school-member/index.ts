import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is school_admin or master_admin
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", caller.id);

    const isAuthorized = callerRoles?.some(
      (r) => r.role === "master_admin" || r.role === "school_admin"
    );
    if (!isAuthorized) throw new Error("Only school admins can create member accounts");

    const { email, password, full_name, school_id, role, record_id, table_name, allow_update } = await req.json();

    if (!email || !password || !school_id || !role) {
      throw new Error("email, password, school_id, and role are required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify caller has access to this school
    const callerSchoolAccess = callerRoles?.some(
      (r) => r.role === "master_admin" || (r.role === "school_admin" && r.school_id === school_id)
    );
    if (!callerSchoolAccess) throw new Error("You don't have access to this school");

    // Validate role
    const validRoles = ["teacher", "sub_admin", "student"];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(", ")}`);
    }

    // Check if member record exists
    let existingLinkedUserId: string | null = null;
    if (record_id && table_name) {
      const validTables = ["teachers", "staff", "students"];
      if (!validTables.includes(table_name)) {
        throw new Error("Invalid table_name");
      }

      const { data: existingMember } = await supabaseAdmin
        .from(table_name)
        .select("id, user_id")
        .eq("id", record_id)
        .maybeSingle();

      if (existingMember?.user_id) {
        existingLinkedUserId = existingMember.user_id;
        // If not explicitly allowing update and different email/intent, warn
        if (!allow_update) {
          // If updating password for current member or re-linking
          console.info("Member already has user_id, updating credentials/password");
        }
      }
    }

    // Check if email is already registered
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    let userId: string;

    if (existingUser) {
      // Check if this existing user is already linked to a record in the target table
      if (record_id && table_name) {
        const validTables = ["teachers", "staff", "students"];
        if (validTables.includes(table_name)) {
          const { data: alreadyLinked } = await supabaseAdmin
            .from(table_name)
            .select("id")
            .eq("user_id", existingUser.id)
            .maybeSingle();

          if (alreadyLinked && String(alreadyLinked.id) !== String(record_id)) {
            throw new Error("এই email ইতোমধ্যে অন্য একটি রেকর্ডে সংযুক্ত আছে।");
          }
        }
      }
      // Reuse the existing auth user
      userId = existingUser.id;

      // Update password if provided
      if (password) {
        await supabaseAdmin.auth.admin.updateUser(userId, { password });
      }
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || normalizedEmail },
      });

      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Update profile with school_id
    await supabaseAdmin
      .from("profiles")
      .update({ school_id, full_name: full_name || normalizedEmail })
      .eq("user_id", userId);

    // Assign role (try insert, ignore if duplicate)
    try {
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role,
        school_id,
      });
    } catch (_) {
      // Role already exists, that's fine
    }

    // Link auth user to the record in the respective table
    if (record_id && table_name) {
      const validTables = ["teachers", "staff", "students"];
      if (validTables.includes(table_name)) {
        if (table_name === "students") {
          // students table does not have an email column
          await supabaseAdmin
            .from("students")
            .update({ user_id: userId })
            .eq("id", record_id);
        } else {
          try {
            await supabaseAdmin
              .from(table_name)
              .update({ user_id: userId, email: normalizedEmail })
              .eq("id", record_id);
          } catch (_) {
            await supabaseAdmin
              .from(table_name)
              .update({ user_id: userId })
              .eq("id", record_id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});