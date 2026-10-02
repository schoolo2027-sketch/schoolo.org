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

    // Verify caller is master_admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "master_admin")
      .maybeSingle();

    if (!roleCheck) throw new Error("Only master admins can create school admins");

    const { admin_email, admin_password, admin_name, school_id } = await req.json();

    if (!admin_email || !admin_password || !school_id) {
      throw new Error("admin_email, admin_password, and school_id are required");
    }

    const normalizedEmail = String(admin_email).trim().toLowerCase();

    // Check if this school already has an admin
    const { data: existingSchoolAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("school_id", school_id)
      .eq("role", "school_admin")
      .maybeSingle();

    if (existingSchoolAdmin) {
      throw new Error("এই স্কুলে admin login আগেই set করা আছে");
    }

    // Check if email is already registered
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );
    if (existingUser) {
      throw new Error("এই email ইতোমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে অন্য email ব্যবহার করুন।");
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_name || normalizedEmail },
    });

    if (createError) throw createError;

    const userId = newUser.user.id;

    // Update profile with school_id
    await supabaseAdmin
      .from("profiles")
      .update({ school_id, full_name: admin_name || normalizedEmail })
      .eq("user_id", userId);

    // Assign school_admin role (upsert to avoid duplicates)
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "school_admin", school_id },
      { onConflict: "user_id,role" }
    );
    if (roleError) {
      // Fallback: try insert if upsert fails
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "school_admin",
        school_id,
      });
    }

    // Update school with admin info
    await supabaseAdmin
      .from("schools")
      .update({ admin_name: admin_name || null, admin_email: normalizedEmail })
      .eq("id", school_id);

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